/*
 * Setting up Mock for all tests
 */

// During the test the env variable is set to test
process.env.NODE_ENV = 'test'

const config = require('config')
const nock = require('nock')
const prepare = require('mocha-prepare')
const url = require('url')

prepare(function (done) {
  // called before loading of test cases
  // Mock Review API
  const reviewAPI = url.parse(config.REVIEW_API_URL)
  nock(/localhost/, { allowUnmocked: true })
    .persist()
    .post(reviewAPI.path)
    .query(true)
    .reply(200)
  done()
}, function (done) {
  // called after all test completes (regardless of errors)
  nock.cleanAll()
  done()
})
