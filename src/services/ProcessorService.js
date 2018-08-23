/**
 * Service for event processor.
 */

const bluebird = require('bluebird')
const config = require('config')
const Joi = require('joi')
const axios = require('axios')
const FormData = require('form-data')
const uuid = require('uuid/v4')
const logger = require('../common/logger')
const helper = require('../common/helper')
const AWS = require('aws-sdk')

AWS.config.region = config.get('aws.REGION')
const s3 = new AWS.S3()
const s3p = bluebird.promisifyAll(s3)
const REVIEW_TYPE_AVSCAN = 'f28b2725-ef90-4495-af59-ceb2bd98fc10'
const REVIEW_SCORECARDID = '30001850'; // CWD-- TODO: make config or dynamicaly driven

/**
 * Process message.
 * @param {Object} message the message
 */
function * processMessage (message) {
  // check whether the submission file is at DMZ area
  let dmzS3Obj
  const fileName = message.payload.id + '.' + message.payload.fileType
  try {
    dmzS3Obj = yield s3p.getObjectAsync({ Bucket: config.get('aws.DMZ_BUCKET'), Key: fileName })
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
    dmzS3Obj = yield s3p.getObjectAsync({ Bucket: config.get('aws.DMZ_BUCKET'), Key: fileName })
  }

  // scan the file in DMZ
  logger.info(`Scanning the file ${fileName}.`)
  const form = new FormData()
  form.append('file', dmzS3Obj.Body, { filename: fileName })
  const scanResult = yield axios.post(config.ANTIVIRUS_API_URL, form, { headers: form.getHeaders() })
  let destinationBucket = config.get('aws.CLEAN_BUCKET')
  if (!scanResult.data.infected) {
    logger.info(`The file ${fileName} is clean. Moving file to clean submission area.`)
  } else {
    logger.info(`The file ${fileName} is infected. Moving file to quarantine area.`)
    destinationBucket = config.get('aws.QUARANTINE_BUCKET')
  }

  const movedS3Obj = yield helper.moveFile(config.get('aws.DMZ_BUCKET'), fileName, destinationBucket, fileName)
  logger.debug(`moved file: ${JSON.stringify(movedS3Obj)}`)
  logger.info('Create review using Review API') //  CWD-- TODO: need to update the URL of the submission here
  yield helper.postToReviewAPI({
    score: scanResult.data.infected ? 0 : 100,
    reviewerId: uuid(), //  CWD-- TODO: should fix this to a specific Id
    submissionId: message.payload.id,
    scoreCardId: REVIEW_SCORECARDID,
    typeId: REVIEW_TYPE_AVSCAN
//    url: movedS3Obj
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
      fileType: Joi.string().required(),
      isFileSubmission: Joi.boolean()
    }).unknown(true).required()
  }).required()
}

// Exports
module.exports = {
  processMessage
}

logger.buildService(module.exports)
