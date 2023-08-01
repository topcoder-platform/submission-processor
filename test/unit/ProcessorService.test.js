/**
 * Unit tests for Processor Service
 */

// During the test the env variable is set to test
process.env.NODE_ENV = 'test'

const should = require('should') // eslint-disable-line
const ProcessorService = require('../../src/services/ProcessorService')
const config = require('config')
const testHelper = require('../common/testHelper')
const { infectedSubmission, goodSubmission, s3Submission, ignoredSubmission, largeSubmission } = require('../common/testData')

describe('Processor Service Unit tests', () => {
  it('Infected submission should get moved to quarantine area', async (done) => {
    const result = await ProcessorService.processMessage(infectedSubmission)
    const fileName = `${infectedSubmission.payload.id}.zip`
    await testHelper.checkFileExistence(config.get('aws.QUARANTINE_BUCKET'), fileName)
    result.should.equal(true)
    done()
  }).timeout(30000)

  it('Good submission should get moved to the clean area', async (done) => {
    const result = await ProcessorService.processMessage(goodSubmission)
    const fileName = `${goodSubmission.payload.id}.zip`
    await testHelper.checkFileExistence(config.get('aws.CLEAN_BUCKET'), fileName)
    result.should.equal(true)
    done()
  }).timeout(30000)

  it('Good submission from S3 should get moved to the clean area', async (done) => {
    const result = await ProcessorService.processMessage(s3Submission)
    const fileName = `${s3Submission.payload.id}.zip`
    await testHelper.checkFileExistence(config.get('aws.CLEAN_BUCKET'), fileName)
    result.should.equal(true)
    done()
  }).timeout(30000)

  it('Non-submission events from Bus should get ignored', async (done) => {
    const result = await ProcessorService.processMessage(ignoredSubmission)
    result.should.equal(false)
    done()
  }).timeout(30000)

  it('Large submission should get moved to the clean area', async (done) => {
    console.log('processing large file')
    const result = await ProcessorService.processMessage(largeSubmission)
    console.log('processing large file result', result)
    result.should.equal(true)
    const fileName = `${largeSubmission.payload.id}.zip`
    console.log('checking for large file ', fileName)
    await testHelper.checkFileExistence(config.get('aws.CLEAN_BUCKET'), fileName)
    result.should.equal(true)
    done()
  }).timeout(500000)
})
