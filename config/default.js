/**
 * The configuration file.
 */
module.exports = {
  LOG_LEVEL: process.env.LOG_LEVEL || 'debug',
  MAXFILESIZE: process.env.MAXFILESIZE || 4294967296,

  // Kafka group id
  KAFKA_GROUP_ID: process.env.KAFKA_GROUP_ID || 'submission-processor',

  KAFKA_URL: process.env.KAFKA_URL || 'localhost:9092',
  KAFKA_CLIENT_CERT: process.env.KAFKA_CLIENT_CERT,
  KAFKA_CLIENT_CERT_KEY: process.env.KAFKA_CLIENT_CERT_KEY,
  SUBMISSION_CREATE_TOPIC: process.env.SUBMISSION_CREATE_TOPIC || 'submission.notification.create',
  AVSCAN_TOPIC: process.env.AVSCAN_TOPIC || 'avscan.action.scan',

  // AWS related parameters
  aws: {
    REGION: process.env.REGION || 'us-east-1',
    DMZ_BUCKET: process.env.DMZ_BUCKET,
    CLEAN_BUCKET: process.env.CLEAN_BUCKET,
    QUARANTINE_BUCKET: process.env.QUARANTINE_BUCKET
  },

  SUBMISSION_API_URL: process.env.SUBMISSION_API_URL || 'http://localhost:3010/api/v5',
  ANTIVIRUS_API_URL: process.env.ANTIVIRUS_API_URL || 'http://localhost:3010/v5/batchScan',

  AUTH0_URL: process.env.AUTH0_URL, // Auth0 credentials for Submission Service
  AUTH0_AUDIENCE: process.env.AUTH0_AUDIENCE || 'https://www.topcoder.com',
  TOKEN_CACHE_TIME: process.env.TOKEN_CACHE_TIME,
  AUTH0_CLIENT_ID: process.env.AUTH0_CLIENT_ID,
  AUTH0_CLIENT_SECRET: process.env.AUTH0_CLIENT_SECRET,
  AUTH0_PROXY_SERVER_URL: process.env.AUTH0_PROXY_SERVER_URL
}
