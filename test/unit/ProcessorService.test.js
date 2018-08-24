/**
 * Unit tests for Processor Service
 */

// During the test the env variable is set to test
process.env.NODE_ENV = 'test'

const should = require('should') // eslint-disable-line
const ProcessorService = require('../../src/services/ProcessorService')
const config = require('config')
const co = require('co')
const testHelper = require('../common/testHelper')
const { infectedSubmission, goodSubmission, s3Submission, ignoredSubmission, largeSubmission } = require('../common/testData')

describe('Processor Service Unit tests', () => {
  it('Infected submission should get moved to quarantine area', (done) => {
    co(function * () {
      const result = yield ProcessorService.processMessage(infectedSubmission)
      const fileName = `${infectedSubmission.payload.id}.zip`
      yield testHelper.checkFileExistence(config.get('aws.QUARANTINE_BUCKET'), fileName)
      result.should.equal(true)
    })
      .then(() => done())
      .catch(done)
  }).timeout(30000)

  it('Good submission should get moved to the clean area', (done) => {
    co(function * () {
      const result = yield ProcessorService.processMessage(goodSubmission)
      const fileName = `${goodSubmission.payload.id}.zip`
      yield testHelper.checkFileExistence(config.get('aws.CLEAN_BUCKET'), fileName)
      result.should.equal(true)
    })
      .then(() => done())
      .catch(done)
  }).timeout(30000)

  it('Good submission from S3 should get moved to the clean area', (done) => {
    co(function * () {
      const result = yield ProcessorService.processMessage(s3Submission)
      const fileName = `${s3Submission.payload.id}.zip`
      yield testHelper.checkFileExistence(config.get('aws.CLEAN_BUCKET'), fileName)
      result.should.equal(true)
    })
      .then(() => done())
      .catch(done)
  }).timeout(30000)

  it('Non-submission events from Bus should get ignored', (done) => {
    co(function * () {
      const result = yield ProcessorService.processMessage(ignoredSubmission)
      result.should.equal(false)
    })
      .then(() => done())
      .catch(done)
  }).timeout(30000)


  it('Large submission should get moved to the clean area', (done) => {
    co(function * () {
      console.log('processing large file')
      const result = yield ProcessorService.processMessage(largeSubmission)
      console.log('processing large file result', result)
      result.should.equal(true)
      const fileName = `${largeSubmission.payload.id}.zip`
      console.log('checking for large file ', fileName)
      yield testHelper.checkFileExistence(config.get('aws.CLEAN_BUCKET'), fileName)
      result.should.equal(true)
    })
      .then(() => done())
      .catch(done)
  }).timeout(500000)
})
