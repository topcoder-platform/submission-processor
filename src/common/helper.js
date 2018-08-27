/**
 * Contains generic helper methods
 */

const _ = require('lodash')
const axios = require('axios')
const bluebird = require('bluebird')
const config = require('config')
const logger = require('./logger')
const AWS = require('aws-sdk')
const AmazonS3URI = require('amazon-s3-uri')

AWS.config.region = config.get('aws.REGION')
const s3 = new AWS.S3()
const s3p = bluebird.promisifyAll(s3)
const m2mAuth = require('tc-core-library-js').auth.m2m
const m2m = m2mAuth(_.pick(config, ['AUTH0_URL', 'AUTH0_AUDIENCE', 'TOKEN_CACHE_TIME']))

/* Function to get M2M token
 * @returns {Promise}
 */
function * getM2Mtoken () {
  return yield m2m.getMachineToken(config.AUTH0_CLIENT_ID, config.AUTH0_CLIENT_SECRET)
}

/**
 * Function to send request to Submission API
 * @param{String} reqType Type of the request POST / PATCH
 * @param(String) path Complete path of the Submission API URL
 * @param{Object} reqBody Body of the request
 * @returns {Promise}
 */
function * reqToSubmissionAPI (reqType, path, reqBody) {
  // Token necessary to send request to Submission API
  const token = yield getM2Mtoken()
  if (reqType === 'POST') {
    yield axios.post(path, reqBody, { headers: { 'Authorization': `Bearer ${token}` } })
  } else if (reqType === 'PATCH') {
    yield axios.patch(path, reqBody, { headers: { 'Authorization': `Bearer ${token}` } })
  }
}

/**
 * Function to download file from given URL
 * @param{String} fileURL URL of the file to be downloaded
 * @returns {Buffer} Buffer of downloaded file
 */
function * downloadFile (fileURL) {
  let downloadedFile
  if (/.*amazonaws.*/.test(fileURL)) {
    const { bucket, key } = AmazonS3URI(fileURL)
    logger.info(`downloadFile(): file is on S3 ${bucket} / ${key}`)
    downloadedFile = yield s3p.getObjectAsync({ Bucket: bucket, Key: key })
    return downloadedFile.Body
  } else {
    logger.info(`downloadFile(): file is (hopefully) a public URL at ${fileURL}`)
    downloadedFile = yield axios.get(fileURL, { responseType: 'arraybuffer' })
    return downloadedFile.data
  }
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

module.exports = {
  reqToSubmissionAPI,
  downloadFile,
  moveFile
}
