/**
 * Contains generic helper methods
 */

const _ = require('lodash')
const axios = require('axios')
const bluebird = require('bluebird')
const config = require('config')
const url = require('url')
const AWS = require('aws-sdk')

AWS.config.region = config.get('aws.REGION')
const s3 = new AWS.S3()
const s3p = bluebird.promisifyAll(s3)

/**
 * Function to POST to Review API
 * @param{Object} reqBody Body of the request to be Posted
 * @returns {Promise}
 */
function * postToReviewAPI (reqBody) {
  yield axios.post(config.REVIEW_API_URL, reqBody)
}

/**
 * Function to download file from given URL
 * @param{String} fileURL URL of the file to be downloaded
 * @returns {Buffer} Buffer of downloaded file
 */
function * downloadFile (fileURL) {
  let downloadedFile
  if (/.*amazonaws.*/.test(fileURL)) {
    const parts = url.parse(fileURL).pathname.split('/')
    downloadedFile = yield s3p.getObjectAsync({ Bucket: parts[parts.length-2], Key: parts[parts.length-1] })
    return downloadedFile.Body
  } else {
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
  postToReviewAPI,
  downloadFile,
  moveFile
}
