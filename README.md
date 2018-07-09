# Topcoder Submission API - Event Processor
Event Processor for Topcoder Submission API

## Prerequisites
- Nodejs >= 8
- Kafka >= 2.11

## Local Deployment
For local development, you will need to install Kafka - kindly follow https://kafka.apache.org/quickstart to setup local Kafka setup. Make sure you complete Step 1 to Step 3 and then use the topic created in config of this application. Step 4 will be used to send sample messages as described below in Section `Sample Messages`

To install dependencies just:
```
npm i
```

To run the event-processer, just:
```
npm start
```

```
Note: For production, kindly set environment variable NODE_ENV='production' - the app will now run in production mode.
```

## Configuration
For dev, it is handled via `config/default.json`. For production, we use `config/productions.json`

`KAFKA_URL`: This is list of Kafka Brokers ex: "kafka://127.0.0.1:9092",
`TOPIC`: Topic Name,
`DMZ_STORAGE_AREA_BUCKET`: Bucket Name of DMZ Storage Area,
`CLEAN_SUBMISSION_BUCKET`: Bucket Name of Clean Submission,
`QUARANTINE_AREA_BUCKET`:  Bucket Name of Quarantine Submission,
`SUBMISSION_ENPOINT`: Endpoint of Submissions API (used for POST /reviews)

`Note:` Kindly note bucket name has certain restrictions, kindly refer to https://docs.aws.amazon.com/awscloudtrail/latest/userguide/cloudtrail-s3-bucket-naming-requirements.html for details on the same.

Along with above the processor also needs AWS Secret Key and Access Key for AWS to be configured on your machine.
1. To generate your Access Key and Secret Key, you need to login into your AWS Management Console. Click `My Security Credentials` as shown here - https://cl.ly/2U2640151G1S.
2. We will land onto the page as shown in the screen in Step 1. Now click `Create New Access key` and generate the Access Key and Secret Key. Copy and paste the values in the file `docs/credentials` against respective fields.
3. Copy the file `docs/credentials` to `~/.aws/credentials on Mac/Linux` or `C:\Users\USERNAME\.aws\credentials on Windows`. 

## Standard
We use node module Standard for Style Guide - you can use `standard` on root folder to check for style guide issues

## Logging
We use `winston` for logging - all logs go under folder `logs/` - we have 2 files there - one for error logs called `error.log` and another for info logs  called `combined.logs`. The logs go to console too in dev env, we just need to make sure NODE_ENV is not set to `production` - if set to `production` all logs go in respective files only.

## Verification
Verification video can be found here - https://youtu.be/2KSSwF54Gjk


## Sample Messages
Kindly find below sample messages which we can use for testing

`Valid Messages:`
{"challengeId": 1001,"userId": 10001,"submissionType": "sub","isFileSubmission": "false","fileType": "text/plain","filename": "foo.jpg","fileURL": "http://unicorn.com/foo.jpg","legacySubmissionId": 1001}

{"submissionId": 5001,"challengeId": 1001,"userId": 10001,"submissionType": "sub","isFileSubmission": "false","fileType": "text/plain","filename": "foo.jpg","fileURL": "http://unicorn.com/foo.jpg","legacySubmissionId": 1001}

`Invalid Messages:`
{"challengeId": 1001,"submissionType": "sub","isFileSubmission": false,"fileType": "text/plain","filename": "foo.jpg","fileURL": "http://unicorn.com/foo.jpg","legacySubmissionId": 1001}
