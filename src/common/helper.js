/**
 * Contains generic helper methods
 */

const _ = require('lodash')
const axios = require('axios')
const config = require('config')
const logger = require('./logger')
const AmazonS3URI = require('amazon-s3-uri')

const m2mAuth = require('tc-core-library-js').auth.m2m
const m2m = m2mAuth(_.pick(config, ['AUTH0_URL', 'AUTH0_AUDIENCE', 'TOKEN_CACHE_TIME', 'AUTH0_PROXY_SERVER_URL']))

// Variable to cache reviewTypes from Submission API
const reviewTypes = {}

/* Function to get M2M token
 * @returns {Promise}
 */
async function getM2Mtoken () {
  return await m2m.getMachineToken(config.AUTH0_CLIENT_ID, config.AUTH0_CLIENT_SECRET)
}

/**
 * Function to send request to Submission API
 * @param{String} reqType Type of the request POST / PATCH
 * @param(String) path Complete path of the Submission API URL
 * @param{Object} reqBody Body of the request
 * @returns {Promise}
 */
async function reqToSubmissionAPI (reqType, path, reqBody) {
  // Token necessary to send request to Submission API
  const token = await getM2Mtoken()
  if (reqType === 'POST') {
    await axios.post(path, reqBody, { headers: { Authorization: `Bearer ${token}` } })
  } else if (reqType === 'PATCH') {
    await axios.patch(path, reqBody, { headers: { Authorization: `Bearer ${token}` } })
  } else if (reqType === 'GET') {
    return await axios.get(path, { headers: { Authorization: `Bearer ${token}` } })
  }
}

/*
 * Function to get reviewTypeId from Name
 * @param{String} reviewTypeName Name of the reviewType
 * @returns{String} reviewTypeId
 */
async function getreviewTypeId (reviewTypeName) {
  if (reviewTypes[reviewTypeName]) {
    return reviewTypes[reviewTypeName]
  } else {
    const response = await reqToSubmissionAPI('GET',
      `${config.SUBMISSION_API_URL}/reviewTypes?name=${reviewTypeName}`, {})
    if (response.data.length !== 0) {
      reviewTypes[reviewTypeName] = response.data[0].id
      return reviewTypes[reviewTypeName]
    }
    return null
  }
}

function validateS3URI (fileURL) {
  try {
    const { region, bucket, key } = AmazonS3URI(fileURL)
    if (region !== config.get('aws.REGION') || bucket !== config.get('aws.DMZ_BUCKET')) {
      return { isValid: false }
    }
    return { isValid: true, bucket, key }
  } catch (error) {
    logger.error(error.message)
  }
  return { isValid: false }
}

module.exports = {
  reqToSubmissionAPI,
  getreviewTypeId,
  validateS3URI
}
