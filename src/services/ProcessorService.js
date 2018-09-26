/**
 * Service for event processor.
 */

const bluebird = require('bluebird')
const config = require('config')
const Joi = require('joi')
const axios = require('axios')
const uuid = require('uuid/v4')
const logger = require('../common/logger')
const helper = require('../common/helper')
const AWS = require('aws-sdk')

AWS.config.region = config.get('aws.REGION')
const s3 = new AWS.S3()
const s3p = bluebird.promisifyAll(s3)
const AV_SCAN = 'AV Scan'
const REVIEW_SCORECARDID = '30001850' // CWD-- TODO: make config or dynamicaly driven

/**
 * Process Submission creation event
 * @param {Object} message the message
 */
function * processCreate (message) {
  if (message.payload.resource !== 'submission') {
    logger.info(`ignoring messages of resource type: ${message.resource}`)
    return false
  }

  // check whether the submission file is at DMZ area
  const fileName = message.payload.id + '.' + message.payload.fileType
  try {
    yield s3p.getObjectAsync({ Bucket: config.get('aws.DMZ_BUCKET'), Key: fileName })
    // the file is already in DMZ area
    logger.info(`The file ${fileName} is already in DMZ area.`)
  } catch (e) {
    if (e.statusCode !== 404) {
      // unexpected error, rethrow it
      throw e
    }
    // the file is not in DMZ area, then copy it to DMZ area
    logger.info(`The file ${fileName} is not in DMZ area, copying it to DMZ area.`)
    const downloadedFile = yield helper.downloadFile(message.payload.url)
    yield s3p.uploadAsync({ Bucket: config.get('aws.DMZ_BUCKET'), Key: fileName, Body: downloadedFile })
  }

  const dmzFileURL = `https://s3.amazonaws.com/${config.get('aws.DMZ_BUCKET')}/${fileName}`
  // Send request to Scan the file
  logger.info(`Sending request to scan the file ${fileName}.`)
  const reqBody = {
    submissionId: message.payload.id,
    url: dmzFileURL,
    fileName: fileName
  }
  yield axios.post(config.ANTIVIRUS_API_URL, reqBody, { maxContentLength: config.MAXFILESIZE })

  return true
}

processCreate.schema = {
  message: Joi.object().keys({
    topic: Joi.string().required(),
    originator: Joi.string().required(),
    timestamp: Joi.date().required(),
    'mime-type': Joi.string().required(),
    payload: Joi.object().keys({
      resource: Joi.alternatives().try(Joi.string().valid('submission'), Joi.string().valid('review')).required(),
      id: Joi.string().required(),
      url: Joi.string().uri().trim(),
      fileType: Joi.string(),
      isFileSubmission: Joi.boolean()
    }).unknown(true).required()
  }).required()
}

/**
 * Process Scan completion event
 * @param {Object} message the message
 */
function * processScan (message) {
  let destinationBucket = config.get('aws.CLEAN_BUCKET')
  const fileName = message.payload.fileName
  if (!message.payload.isInfected) {
    logger.info(`The file ${fileName} is clean. Moving file to clean submission area.`)
  } else {
    logger.info(`The file ${fileName} is infected. Moving file to quarantine area.`)
    destinationBucket = config.get('aws.QUARANTINE_BUCKET')
  }

  yield helper.moveFile(config.get('aws.DMZ_BUCKET'), fileName, destinationBucket, fileName)
  const movedS3Obj = `https://s3.amazonaws.com/${destinationBucket}/${fileName}`
  logger.debug(`moved file: ${JSON.stringify(movedS3Obj)}`)
  logger.info('Update Submission final location using Submission API')
  yield helper.reqToSubmissionAPI('PATCH', `${config.SUBMISSION_API_URL}/submissions/${message.payload.submissionId}`,
    { url: movedS3Obj })

  logger.info('Create review using Submission API')
  yield helper.reqToSubmissionAPI('POST', `${config.SUBMISSION_API_URL}/reviews`, {
    score: message.payload.isInfected ? 0 : 100,
    reviewerId: uuid(), //  CWD-- TODO: should fix this to a specific Id
    submissionId: message.payload.submissionId,
    scoreCardId: REVIEW_SCORECARDID,
    typeId: yield helper.getreviewTypeId(AV_SCAN)
  })
}

processScan.schema = {
  message: Joi.object().keys({
    topic: Joi.string().required(),
    originator: Joi.string().required(),
    timestamp: Joi.date().required(),
    'mime-type': Joi.string().required(),
    payload: Joi.object().keys({
      submissionId: Joi.string().required(),
      url: Joi.string().required(),
      fileName: Joi.string().required(),
      status: Joi.string().required(),
      isInfected: Joi.boolean().required()
    }).unknown(true).required()
  }).required()
}

// Exports
module.exports = {
  processCreate,
  processScan
}

logger.buildService(module.exports)
