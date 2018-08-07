/**
 * Configuration file to be used while running tests
 */

module.exports = {
  aws: {
    REGION: process.env.REGION || 'us-east-1',
    DMZ_BUCKET: process.env.DMZ_BUCKET_TEST,
    CLEAN_BUCKET: process.env.CLEAN_BUCKET_TEST,
    QUARANTINE_BUCKET: process.env.QUARANTINE_BUCKET_TEST
  }
}
