/**
 * Service for event processor.
 */

const config = require('config')
const Joi = require('joi')
const { v4: uuid } = require('uuid')
const logger = require('../common/logger')
const helper = require('../common/helper')
const { S3Client, HeadObjectCommand } = require('@aws-sdk/client-s3')

const s3 = new S3Client({ region: config.get('aws.REGION') })

const AV_SCAN = 'Virus Scan'
const REVIEW_SCORECARDID = '30001850' // CWD-- TODO: make config or dynamicaly driven

/**
 * Process Submission creation event
 * @param {Object} message the message
 */
async function processCreate (message) {
  // check whether the submission file is at DMZ area
  const url = message.payload.url
  const { isValid, bucket, key: fileName } = helper.validateS3URI(url)
  if (!isValid) {
    logger.error(`${message.payload.url} is not a valid`)
  }
  try {
    await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: fileName }))
    // the file is in DMZ area
    logger.info(`The file ${fileName} is in DMZ area.`)
  } catch (e) {
    if (e.name !== 'NotFound') {
      // unexpected error, rethrow it
      throw e
    }
    // the file is not in DMZ area, then copy it to DMZ area
    logger.error(`The file ${fileName} is not in DMZ area`)
    return false
  }

  return {
    submissionId: message.payload.id,
    url,
    fileName,
    moveFile: true,
    cleanDestinationBucket: config.get('aws.CLEAN_BUCKET'),
    quarantineDestinationBucket: config.get('aws.QUARANTINE_BUCKET'),
    callbackOption: 'kafka',
    callbackKafkaTopic: config.get('SUBMISSION_SCAN_TOPIC')
  }
}

processCreate.schema = Joi.object({
  message: Joi.object().keys({
    topic: Joi.string().required(),
    originator: Joi.string().required(),
    timestamp: Joi.date().required(),
    'mime-type': Joi.string().required(),
    payload: Joi.object().keys({
      id: Joi.string().required(),
      url: Joi.string().trim().uri().required()
    }).unknown(true).required()
  }).required()
}).required()

/**
 * Process Scan completion event
 * @param {Object} message the message
 */
async function processScan (message) {
  logger.info('Update Submission final location using Submission API')
  await helper.reqToSubmissionAPI('PATCH', `${config.SUBMISSION_API_URL}/submissions/${message.payload.submissionId}`,
    { url: message.payload.url })

  logger.info('Create review using Submission API')
  await helper.reqToSubmissionAPI('POST', `${config.SUBMISSION_API_URL}/reviews`, {
    score: message.payload.isInfected ? 0 : 100,
    reviewerId: uuid(), //  CWD-- TODO: should fix this to a specific Id
    submissionId: message.payload.submissionId,
    scoreCardId: REVIEW_SCORECARDID,
    typeId: await helper.getreviewTypeId(AV_SCAN)
  })
}

processScan.schema = Joi.object({
  message: Joi.object().keys({
    topic: Joi.string().required(),
    originator: Joi.string().required(),
    timestamp: Joi.date().required(),
    'mime-type': Joi.string().required(),
    payload: Joi.object().keys({
      submissionId: Joi.string().required(),
      url: Joi.string().required(),
      fileName: Joi.string().required(),
      isInfected: Joi.boolean().required()
    }).unknown(true).required()
  }).required()
}).required()

// Exports
module.exports = {
  processCreate,
  processScan
}

logger.buildService(module.exports)
