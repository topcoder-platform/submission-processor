/**
 * The test cases for TC submission processor.
 */

// During the test the env variable is set to test
process.env.NODE_ENV = 'test'

const chai = require('chai')
const chaiHttp = require('chai-http')
const expect = chai.expect
const co = require('co')
const config = require('config')
const Kafka = require('no-kafka')
const testHelper = require('../common/testHelper')
const { infectedSubmission, goodSubmission, s3Submission } = require('../common/testData')
const app = require('../../src/app') // eslint-disable-line no-unused-vars

chai.use(chaiHttp)

describe('TC Submission Processor Tests', () => {
  let producer
  before((done) => {
    // create producer
    const options = { connectionString: config.KAFKA_URL }
    if (config.KAFKA_CLIENT_CERT && config.KAFKA_CLIENT_CERT_KEY) {
      options.ssl = { cert: config.KAFKA_CLIENT_CERT, key: config.KAFKA_CLIENT_CERT_KEY }
    }
    producer = new Kafka.Producer(options)
    producer.init().then(() => done())
  })

  it('Infected submission should get moved to quarantine area', (done) => {
    co(function * () {
      const result = yield producer.send({topic: infectedSubmission.topic,
        message: {
          value: JSON.stringify(infectedSubmission)
        }})
      const fileName = `${infectedSubmission.payload.id}.zip`
      expect(result[0].error).to.be.equal(null)
      yield testHelper.sleep(20000)
      yield testHelper.checkFileExistence(config.get('aws.QUARANTINE_BUCKET'), fileName)
    })
      .then(() => done())
      .catch(done)
  }).timeout(30000)

  it('Good submission should get moved to the clean area', (done) => {
    co(function * () {
      const result = yield producer.send({topic: goodSubmission.topic,
        message: {
          value: JSON.stringify(goodSubmission)
        }})
      const fileName = `${goodSubmission.payload.id}.zip`
      expect(result[0].error).to.be.equal(null)
      yield testHelper.sleep(20000)
      yield testHelper.checkFileExistence(config.get('aws.CLEAN_BUCKET'), fileName)
    })
      .then(() => done())
      .catch(done)
  }).timeout(30000)

  it('Good submission from S3 should get moved to the clean area', (done) => {
    co(function * () {
      const result = yield producer.send({topic: s3Submission.topic,
        message: {
          value: JSON.stringify(s3Submission)
        }})
      const fileName = `${s3Submission.payload.id}.zip`
      expect(result[0].error).to.be.equal(null)
      yield testHelper.sleep(20000)
      yield testHelper.checkFileExistence(config.get('aws.CLEAN_BUCKET'), fileName)
    })
      .then(() => done())
      .catch(done)
  }).timeout(30000)

  it('Health check URL should return the health status', (done) => {
    chai.request(`http://localhost:${process.env.PORT}`)
      .get('/health')
      .end((err, res) => {
        if (err) {
          throw err
        }
        expect(res).to.have.status(200)
        expect(res.body.checksRun).to.be.eql(1)
        done()
      })
  })
})
