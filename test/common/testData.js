/*
 * Test data to be used in tests
 */

const uuid = require('uuid/v4')

const goodSubmission = {
  topic: 'submission.notification.create',
  originator: 'submission-api',
  timestamp: '2018-02-03T00:00:00',
  'mime-type': 'application/json',
  payload: {
    resource: 'submission',
    id: uuid(),
    url: 'https://drive.google.com/file/d/1l7KPjqzHtF9dA94cMjJ4a32yRvPEQIg4/view?usp=sharing',
    fileType: 'zip',
    isFileSubmission: false
  }
}

const infectedSubmission = {
  topic: 'submission.notification.create',
  originator: 'submission-api',
  timestamp: '2018-02-03T00:00:00',
  'mime-type': 'application/json',
  payload: {
    resource: 'submission',
    id: uuid(),
    url: 'https://www.dropbox.com/s/31idvhiz9l7v35k/EICAR_submission.zip?dl=1',
    fileType: 'zip',
    isFileSubmission: false
  }
}

const s3Submission = {
  topic: 'submission.notification.create',
  originator: 'submission-api',
  timestamp: '2018-02-03T00:00:00',
  'mime-type': 'application/json',
  payload: {
    resource: 'submission',
    id: uuid(), // Below URL is from public S3 bucket for testing
    url: 'https://s3.amazonaws.com/tc-testing-submissions/good_submission.zip',
    fileType: 'zip',
    isFileSubmission: false
  }
}

module.exports = {
  goodSubmission,
  infectedSubmission,
  s3Submission
}
