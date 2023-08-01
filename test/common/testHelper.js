/**
 * Contains helper methods for tests
 */

const _ = require('lodash')
const config = require('config')
const expect = require('chai').expect
const { S3Client, HeadObjectCommand } = require('@aws-sdk/client-s3')

const s3 = new S3Client({ region: config.get('aws.REGION') })

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
function sleep (ms) {
  return new Promise(resolve => {
    setTimeout(resolve, ms)
  })
}

/*
 * Check existence of file in given S3 bucket
 * @param{String} bucket Bucket name
 * @param{String} fileName File name to be used as key
 */
async function checkFileExistence (bucket, fileName) {
  const file = await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: fileName }))
  expect(file).to.be.not.equal(null)
}

module.exports = {
  expectObject,
  sleep,
  checkFileExistence
}
