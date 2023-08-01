/**
 * The application entry point
 */

global.Promise = require('bluebird')
const config = require('config')
const logger = require('./common/logger')
const Kafka = require('no-kafka')
const ProcessorService = require('./services/ProcessorService')
const healthcheck = require('topcoder-healthcheck-dropin')

// create consumer
const options = {
  connectionString: config.KAFKA_URL,
  groupId: config.KAFKA_GROUP_ID
}
if (config.KAFKA_CLIENT_CERT && config.KAFKA_CLIENT_CERT_KEY) {
  options.ssl = {
    cert: config.KAFKA_CLIENT_CERT,
    key: config.KAFKA_CLIENT_CERT_KEY
  }
}
const consumer = new Kafka.GroupConsumer(options)

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

    // Process only messages with scanned status
    if (
      messageJSON.topic === config.AVSCAN_TOPIC &&
      messageJSON.payload.status !== 'scanned'
    ) {
      logger.debug(
        `Ignoring message in topic ${messageJSON.topic} with status ${messageJSON.payload.status}`
      )
      // ignore the message

      await consumer.commitOffset({ topic, partition, offset: m.offset })
      return
    }

    if (
      topic === config.SUBMISSION_CREATE_TOPIC &&
      messageJSON.payload.fileType === 'url'
    ) {
      logger.debug(
        `Ignoring message in topic ${messageJSON.topic} with file type as url`
      )
      // ignore the message

      await consumer.commitOffset({ topic, partition, offset: m.offset })
      return
    }

    try {
      switch (topic) {
        case config.SUBMISSION_CREATE_TOPIC:
          await ProcessorService.processCreate(messageJSON)
          break
        case config.AVSCAN_TOPIC:
          await ProcessorService.processScan(messageJSON)
          break
        default:
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

const topics = [config.SUBMISSION_CREATE_TOPIC, config.AVSCAN_TOPIC]

consumer
  .init([
    {
      subscriptions: topics,
      handler: dataHandler
    }
  ])
  // consume configured topics
  .then(() => {
    logger.info('Initialized.......')
    healthcheck.init([check])
    logger.info('Adding topics successfully.......')
    logger.info(topics)
    logger.info('Kick Start.......')
  }).catch(logger.logFullError)
