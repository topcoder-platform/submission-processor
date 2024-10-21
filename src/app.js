/**
 * The application entry point
 */

global.Promise = require('bluebird')
const config = require('config')
const logger = require('./common/logger')
const Kafka = require('no-kafka')
const ProcessorService = require('./services/ProcessorService')
const healthcheck = require('topcoder-healthcheck-dropin')
const _ = require('lodash')

// create consumer
const options = {
  connectionString: config.KAFKA_URL
}

if (config.KAFKA_CLIENT_CERT && config.KAFKA_CLIENT_CERT_KEY) {
  options.ssl = {
    cert: config.KAFKA_CLIENT_CERT,
    key: config.KAFKA_CLIENT_CERT_KEY
  }
}

const consumer = new Kafka.GroupConsumer({ ...options, groupId: config.KAFKA_GROUP_ID })
const producer = new Kafka.Producer(options)

// data handler
const dataHandler = async (messageSet, topic, partition) => {
  await Promise.each(messageSet, async (m) => {
    const message = m.message.value.toString('utf8')
    logger.info(
      `Handle Kafka event message; Topic: ${topic}; Partition: ${partition}; Offset: ${m.offset}; Message: ${message}.`
    )
    let messageJSON

    try {
      messageJSON = JSON.parse(message)
    } catch (e) {
      logger.error('Invalid message JSON.')
      logger.error(e)

      // ignore the message
      await consumer.commitOffset({ topic, partition, offset: m.offset })
      return
    }

    if (messageJSON.topic !== topic) {
      logger.error(
        `The message topic ${messageJSON.topic} doesn't match the Kafka topic ${topic}.`
      )
      // ignore the message

      await consumer.commitOffset({ topic, partition, offset: m.offset })
      return
    }

    if (
      topic === config.SUBMISSION_CREATE_TOPIC &&
      (_.get(messageJSON, 'payload.resource') !== 'submission' ||
        _.get(messageJSON, 'payload.fileType') === 'url')
    ) {
      console.log(
        `Ignoring message in topic ${messageJSON.topic} as it's resource is not submission and file type is url`
      )
      await consumer.commitOffset({ topic, partition, offset: m.offset })
      return
    }

    try {
      if (topic === config.SUBMISSION_CREATE_TOPIC) {
        const payload = await ProcessorService.processCreate(messageJSON)
        if (payload) {
          logger.info(`Sending request to scan the file ${payload.fileName}.`)
          do {
            let failedCount = 0
            let failed = false
            const result = await producer.send({
              topic: config.AVSCAN_TOPIC,
              message: {
                value: JSON.stringify({
                  topic: config.AVSCAN_TOPIC,
                  originator: 'submission-processor',
                  timestamp: new Date().toISOString(),
                  'mime-type': 'application/json',
                  payload
                })
              }
            })
            const error = _.get(result, '[0].error')
            if(error) {
              logger.error('Raising message to scan the file failed:' + JSON.stringify(error))
              failed = true
              failedCount++
            }
          } while (failed && failedCount <=3 )

          if(failedCount > 3) {
            throw new Error('Could not connect to Kafka to request AV scan of file')
          }
        } else {
          logger.error('Cannot process event')
        }
      } else if (topic === config.SUBMISSION_SCAN_TOPIC) {
        await ProcessorService.processScan(messageJSON)
      } else {
        throw new Error(`Invalid topic: ${topic}`)
      }
    } catch (err) {
      logger.logFullError(err)
    } finally {
      await consumer.commitOffset({ topic, partition, offset: m.offset })
    }
  })
}

// check if there is kafka connection alive
function check () {
  if (
    !consumer.client.initialBrokers &&
    !consumer.client.initialBrokers.length
  ) {
    return false
  }
  let connected = true
  consumer.client.initialBrokers.forEach((conn) => {
    if (!conn.connected) {
      logger.error(`url ${conn.server()} - connected=${conn.connected}`)
    }
    connected = conn.connected & connected
  })
  return connected
}

const topics = [config.SUBMISSION_CREATE_TOPIC, config.SUBMISSION_SCAN_TOPIC]

producer.init()
  .then(() => {
    logger.debug('Producer initialized successfully')
    return consumer
      .init([{
        subscriptions: topics,
        handler: dataHandler
      }])
  })
  .then(() => {
    logger.debug('Consumer initialized successfully')
    healthcheck.init([check])
    logger.info('Adding topics successfully.......')
    logger.info(topics)
    logger.info('Kick Start.......')
  }).catch(logger.logFullError)
