/**
 * Contains helper methods for tests
 */

const _ = require('lodash')
const bluebird = require('bluebird')
const config = require('config')
const expect = require('chai').expect
const AWS = require('aws-sdk')

AWS.config.region = config.get('aws.REGION')
const s3 = new AWS.S3()
const s3p = bluebird.promisifyAll(s3)

/**
 * Ensures the target object match all fields/values of the expected object.
 * @param {Object} target the target object
 * @param {Object} expected the expected object
 */
function expectObject (target, expected) {
  _.forIn(expected, (value, key) => {
    expect(target[key]).to.equal(value)
  })
}

/*
 * Sleep the application using Timeout
 * @param {Integer} ms Sleep time in Milliseconds
 * @returns {Promise}
 */
function * sleep (ms) {
  return new Promise(resolve => {
    setTimeout(resolve, ms)
  })
}

/*
 * Check existence of file in given S3 bucket
 * @param{String} bucket Bucket name
 * @param{String} fileName File name to be used as key
 */
function * checkFileExistence (bucket, fileName) {
  try {
    const file = yield s3p.headObjectAsync({ Bucket: bucket, Key: fileName })
    expect(file).to.be.not.equal(null)
  } catch (e) {
    throw e
  }
}

module.exports = {
  expectObject,
  sleep,
  checkFileExistence
}
