/**
 * Unit tests for Processor Service
 */

// During the test the env variable is set to test
process.env.NODE_ENV = 'test'

const ProcessorService = require('../../src/services/ProcessorService')
const config = require('config')
const co = require('co')
const testHelper = require('../common/testHelper')
const { infectedSubmission, goodSubmission, s3Submission } = require('../common/testData')

describe('Processor Service Unit tests', () => {
  it('Infected submission should get moved to quarantine area', (done) => {
    co(function * () {
      yield ProcessorService.processMessage(infectedSubmission)
      const fileName = `${infectedSubmission.payload.id}.zip`
      yield testHelper.checkFileExistence(config.get('aws.QUARANTINE_BUCKET'), fileName)
    })
      .then(() => done())
      .catch(done)
  }).timeout(30000)

  it('Good submission should get moved to the clean area', (done) => {
    co(function * () {
      yield ProcessorService.processMessage(goodSubmission)
      const fileName = `${goodSubmission.payload.id}.zip`
      yield testHelper.checkFileExistence(config.get('aws.CLEAN_BUCKET'), fileName)
    })
      .then(() => done())
      .catch(done)
  }).timeout(30000)

  it('Good submission from S3 should get moved to the clean area', (done) => {
    co(function * () {
      yield ProcessorService.processMessage(s3Submission)
      const fileName = `${s3Submission.payload.id}.zip`
      yield testHelper.checkFileExistence(config.get('aws.CLEAN_BUCKET'), fileName)
    })
      .then(() => done())
      .catch(done)
  }).timeout(30000)
})
