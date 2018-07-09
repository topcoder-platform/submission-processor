const kafka = require('no-kafka')
const config = require('config')
const aws = require('aws-sdk')
const download = require('download')
const rn = require('random-number')
const uuidv1 = require('uuid/v1')
const Client = require('node-rest-client').Client
const client = new Client()
const path = require('path')
const Joi = require('joi')
var winston = require('winston')

// winston related settings - default is 'info'
winston.level = config.get('LOG_LEVEL') || 'info'
var logPath = 'logs/'
const tsFormat = () => (new Date().toISOString())

// logger define - write all logs to file
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  timestamp: tsFormat,
  transports: [
    new winston.transports.File({ filename: path.join(logPath, 'error.log'), level: 'error' }),
    new winston.transports.File({ filename: path.join(logPath, 'combined.log') })
  ]
})

// If we're not in production then log to the `console` with the format:
// `${info.level}: ${info.message} JSON.stringify({ ...rest }) `
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }))
}

// option range for random number generator
const options = {
  min: -1000,
  max: 1000,
  integer: true
}

// review request format
var reviewRequest = {
  score: 0,
  reviewerId: '',
  submissionId: '',
  scorecardId: '',
  typeId: ''
}

// AWS S3 Client
const awsS3Client = new aws.S3({apiVersion: '2006-03-01'})

// DMZ AWS S3 Bucket Params
var dmzBucketParams = {
  Bucket: config.get('DMZ_STORAGE_AREA_BUCKET')
}

// Clean Submission AWS S3 Bucket Params
var cleanBucketParams = {
  Bucket: config.get('CLEAN_SUBMISSION_BUCKET')
}

// Quarantine Submission AWS S3 Bucket Params
var quarantineBucketParams = {
  Bucket: config.get('QUARANTINE_AREA_BUCKET')
}

/**
 * check if file is clean - will be replaced later once we have design ready
 * this function randomly returns true (File is Clean) or false (Not Clean)
 */
function isFileClean () {
  if (rn(options) > 0) {
    return true
  } else {
    return false
  }
}

// this helps process the file ahead once it is uploaded to AWS or already available on AWS
function processFile (message) {
  const source = '/' + dmzBucketParams.Bucket + '/' + message.filename
  if (isFileClean()) {
    logger.info('File is clean - Moving to Clean Submission bucket.')
    cleanBucketParams.CopySource = source
    cleanBucketParams.Key = message.filename
    // file is clean so review Score 100
    reviewRequest.score = 100
    moveAndCreateReview(cleanBucketParams, true, message.submissionId || message.legacySubmissionId)
  } else {
    logger.info('File has vulnerability - Moving to Quarantine bucket.')
    quarantineBucketParams.CopySource = source
    quarantineBucketParams.Key = message.filename
    // file is vulnerable so review Score 0
    reviewRequest.score = 0
    moveAndCreateReview(quarantineBucketParams, false, message.submissionId || message.legacySubmissionId)
  }
}

// this helps move the file between buckets from DMZ to Clean or Quarantine and Post message ahead
function moveAndCreateReview (params, isClean, submissionId) {
  // move the file between buckets
  awsS3Client.copyObject(params, function (err, data) {
    if (err) { // an error occurred
      logger.error('Error while moving files between buckets ' + err)
    } else {
      if (dmzBucketParams.Body) {
        delete dmzBucketParams.Body
      }
      // we should make sure to delete file from DMZ
      awsS3Client.deleteObject(dmzBucketParams, function (err, data) {
        if (err) { // an error occurred
          logger.error('Error while deleting files from DMZ Storage Area - ' + err)
        } else { // successful
          reviewRequest.reviewerId = uuidv1()
          reviewRequest.scorecardId = uuidv1()
          reviewRequest.typeId = uuidv1()
          reviewRequest.submissionId = submissionId

          logger.info('Sending reviewRequest - ' + JSON.stringify(reviewRequest))
          // set content-type header and data as json in args parameter
          var args = {
            data: reviewRequest,
            headers: { 'Content-Type': 'application/json' }
          }

          client.post(config.get('SUBMISSION_ENPOINT'), args, function (data, response) {
            logger.info('Successfully posted to Submission Endpoint')
          })
        }
      })
    }
  })
}

// schema validation of incoming messages
const messageSchema = Joi.object().keys({
  submissionId: Joi.string().optional(),
  challengeId: Joi.number().integer().required(),
  userId: Joi.number().integer().required(),
  submissionType: Joi.string().required(),
  isFileSubmission: Joi.boolean().required(),
  fileType: Joi.string().required(),
  filename: Joi.string().required(),
  fileURL: Joi.string().required(),
  legacySubmissionId: Joi.number().integer().required()
}).required()

// data handler function can return a Promise
var dataHandler = function (messageSet, topic, partition) {
  messageSet.forEach(function (m) {
    logger.info('kafka-message : ' + m.message.value.toString('utf8'))
    var message = {}
    try {
      message = JSON.parse(m.message.value.toString('utf8'))
      // validate incoming message, process only if it is valid else log error message
      // and wait for new messages
      const result = Joi.validate(message, messageSchema)
      if (result.error === null) { // means it is valid message format
        dmzBucketParams.Key = message.filename
        awsS3Client.headObject(dmzBucketParams, function (err, metadata) {
          if (err) {
            if (err.code === 'NotFound') {
              // we put this logs as info as we are good to move and doesn't blocks process
              logger.info('File not found in DMZ Storage Area - downloading from remote and uploading to DMZ Storage Area...')
              download(message.fileURL).then(data => {
                // putting the file to AWS
                dmzBucketParams.Body = data
                awsS3Client.putObject(dmzBucketParams, function (error, uploadData) {
                  if (error) {
                    logger.error('Error while putting file in DMZ Storage Area - ' + error)
                  }
                  logger.info('File successfully uploaded to DMZ Storage Area...')
                  processFile(message)
                })
              })
            } else {
              logger.error('File not found in DMZ Storage Area - exception processing ahead - ' + err)
            }
          } else {
            logger.info('File already exists in DMZ Storage Area...')
            processFile(message)
          }
        })
      } else {
        logger.error('Wrong format of kafka-message received - will not process. Error: ' + result.error)
      }
    } catch (e) {
      logger.info('Invalid incoming message : ' + e)
    }
  })
}

// create Kafka consumer
var consumer = new kafka.SimpleConsumer({
  connectionString: config.get('KAFKA_URL')
})

// listen for new messages on topic
consumer.init().then(function () {
  // Subscribe partitons in topic
  return consumer.subscribe(config.get('TOPIC'), [config.get('PARTITIONS')], dataHandler)
})
