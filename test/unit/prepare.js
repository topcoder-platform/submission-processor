/*
 * Setting up Mock for all tests
 */

// During the test the env variable is set to test
process.env.NODE_ENV = 'test'

const nock = require('nock')
const prepare = require('mocha-prepare')

prepare(function (done) {
  // called before loading of test cases
  // Mock Submission API
  nock(/localhost|.com/, { allowUnmocked: true })
    .persist()
    .filteringPath(function (path) {
      if (path.indexOf('reviews') > -1) {
        return 'valid'
      } else if (path.indexOf('submissions') > -1) {
        return 'valid'
      }
      return path
    })
    .post('valid')
    .query(true)
    .reply(200)
    .patch('valid')
    .query(true)
    .reply(200)
  done()
}, function (done) {
  // called after all test completes (regardless of errors)
  nock.cleanAll()
  done()
})
