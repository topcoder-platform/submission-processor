/**
 * The configuration file.
 */
module.exports = {
  LOG_LEVEL: process.env.LOG_LEVEL || 'debug',

  KAFKA_URL: process.env.KAFKA_URL || 'localhost:9092',
  KAFKA_CLIENT_CERT: process.env.KAFKA_CLIENT_CERT,
  KAFKA_CLIENT_CERT_KEY: process.env.KAFKA_CLIENT_CERT_KEY,
  KAFKA_SUBMISSION_TOPIC: process.env.KAFKA_SUBMISSION_TOPIC,

  ACCESS_KEY_ID: process.env.ACCESS_KEY_ID,
  SECRET_ACCESS_KEY: process.env.SECRET_ACCESS_KEY,
  // AWS region
  REGION: process.env.REGION,
  DMZ_BUCKET: process.env.DMZ_BUCKET,
  CLEAN_BUCKET: process.env.CLEAN_BUCKET,
  QUARANTINE_BUCKET: process.env.QUARANTINE_BUCKET,

  REVIEW_API_URL: process.env.REVIEW_API_URL || 'http://localhost:5000/reviews'
}
