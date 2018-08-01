/**
 * Service for event processor.
 */

const bluebird = require('bluebird')
const config = require('config')
const Joi = require('joi')
const axios = require('axios')
const uuid = require('uuid/v4')
const logger = require('../common/logger')
const AWS = require('aws-sdk')
const FileScanService = require('./FileScanService')

const options = {
  s3: '2006-03-01' // s3 API version
}
if (config.ACCESS_KEY_ID) {
  options.accessKeyId = config.ACCESS_KEY_ID
}
if (config.SECRET_ACCESS_KEY) {
  options.secretAccessKey = config.SECRET_ACCESS_KEY
}
if (config.REGION) {
  options.region = config.REGION
}
AWS.config.update(options)
const s3 = new AWS.S3()
const s3p = bluebird.promisifyAll(s3)

/**
 * Create review.
 * @param {Object} data the review data
 */
function * createReview (data) {
  yield axios.post(config.REVIEW_API_URL, data)
}

/**
 * Move file from one AWS S3 bucket to another bucket.
 * @param {String} sourceBucket the source bucket
 * @param {String} sourceKey the source key
 * @param {String} targetBucket the target bucket
 * @param {String} targetKey the target key
 */
function * moveFile (sourceBucket, sourceKey, targetBucket, targetKey) {
  yield s3p.copyObjectAsync({ Bucket: targetBucket, CopySource: `/${sourceBucket}/${sourceKey}`, Key: targetKey })
  yield s3p.deleteObjectAsync({ Bucket: sourceBucket, Key: sourceKey })
}

/**
 * Process message.
 * @param {Object} message the message
 */
function * processMessage (message) {
  // check whether the submission file is at DMZ area
  let dmzS3Obj
  let payload = message.payload
  let filename = payload.isFileSubmission ? payload.filename : payload.id

  try {
    dmzS3Obj = yield s3p.getObjectAsync({ Bucket: config.DMZ_BUCKET, Key: filename })
    // the file is already in DMZ area
    logger.info(`The file ${filename} is already in DMZ area.`)
  } catch (e) {
    if (e.statusCode !== 404) {
      // unexpected error, rethrow it
      throw e
    }
    // the file is not in DMZ area, then copy it to DMZ area
    logger.info(`The file ${filename} is not in DMZ area, copying it to DMZ area.`)
    const fileURLResponse = yield axios.get(payload.url, { responseType: 'arraybuffer' })
    yield s3p.uploadAsync({ Bucket: config.DMZ_BUCKET, Key: filename, Body: fileURLResponse.data })
    dmzS3Obj = yield s3p.getObjectAsync({ Bucket: config.DMZ_BUCKET, Key: filename })
  }

  // scan the file in DMZ
  logger.info(`Scanning the file ${filename}.`)
  const scanResult = yield FileScanService.scanFile(dmzS3Obj)
  if (scanResult) {
    logger.info(`The file ${filename} is clean. Moving file to clean submission area.`)
    yield moveFile(config.DMZ_BUCKET, filename, config.CLEAN_BUCKET, filename)
  } else {
    logger.info(`The file ${filename} is dirty. Moving file to quarantine area.`)
    yield moveFile(config.DMZ_BUCKET, filename, config.QUARANTINE_BUCKET, filename)
  }

  logger.info('Creating review object.')
  yield createReview({
    score: scanResult ? 100 : 0,
    reviewerId: uuid(),
    submissionId: payload.id,
    scorecardId: uuid(),
    typeId: uuid()
  })
}

processMessage.schema = {
  message: Joi.object().keys({
    topic: Joi.string().required(),
    originator: Joi.string().required(),
    timestamp: Joi.date().required(),
    'mime-type': Joi.string().required(),
    payload: Joi.object().keys({
      resource: Joi.string().valid('submission').required(),
      id: Joi.string().required(),
      url: Joi.string().uri().trim(),
      isFileSubmission: Joi.boolean()
    }).unknown(true).required()
  }).required()
}

// Exports
module.exports = {
  processMessage
}

logger.buildService(module.exports)
