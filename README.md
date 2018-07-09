# Topcoder Submission API - Event Processor

Event Processor for Topcoder Submission API

## Prerequisites

- Nodejs >= 8
- Kafka >= 2.11

## Local Deployment

For local development, you will need to install Kafka - kindly follow https://kafka.apache.org/quickstart to setup local Kafka setup. Make sure you complete Step 1 to Step 3 and then use the topic created in config of this application. Step 4 will be used to send sample messages as described below in Section `Sample Messages`

You can deploy with the following commands

```bash
npm install
npm start
```

## Configuration

The list of available configurations are

- `KAFKA_URL`: This is list of Kafka Brokers ex: "kafka://127.0.0.1:9092"
- `TOPIC`: Topic Name
- `DMZ_STORAGE_AREA_BUCKET`: Bucket Name of DMZ Storage Area
- `CLEAN_SUBMISSION_BUCKET`: Bucket Name of Clean Submission
- `QUARANTINE_AREA_BUCKET`:  Bucket Name of Quarantine Submission
- `SUBMISSION_ENDPOINT`: Endpoint of Submissions API (used for POST /reviews)

Along with above the processor also needs AWS Secret Key and Access Key for AWS to be configured on your machine.

1. Download your AWS Credentials from AWS Console. Refer [AWS Documentation](https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/getting-your-credentials.html)

2. Depending on your Operating System, create AWS credentials file in the path listed below

    ```bash
    Linux, Unix, and macOS users: ~/.aws/credentials

    Windows users: C:\Users\USER_NAME\.aws\credentials
    ```

3. Credentials file should look like below

    ```bash
    [default]
    aws_access_key_id = SOME_ACCESS_KEY_ID
    aws_secret_access_key = SOME_SECRET_ACCESS_KEY
    ```

## Lint

We use [Standard](https://github.com/standard/standard) for linting.

To run the linter, execute

```bash
npm run lint
```

## Sample Messages

Kindly find below sample messages which we can use for testing

```bash
<!-- A valid message -->
{
  "challengeId": 1001,
  "userId": 10001,
  "submissionType": "sub",
  "isFileSubmission": "false",
  "fileType": "text/plain",
  "filename": "foo.jpg",
  "fileURL": "http://unicorn.com/foo.jpg",
  "legacySubmissionId": 1001
}

<!-- Another valid message -->
{
  "submissionId": 5001,
  "challengeId": 1001,
  "userId": 10001,
  "submissionType": "sub",
  "isFileSubmission": "false",
  "fileType": "text/plain",
  "filename": "foo.jpg",
  "fileURL": "http://unicorn.com/foo.jpg",
  "legacySubmissionId": 1001
}

<!-- An invalid message -->
{
  "challengeId": 1001,
  "submissionType": "sub",
  "isFileSubmission": false,
  "fileType": "text/plain",
  "filename": "foo.jpg",
  "fileURL": "http://unicorn.com/foo.jpg",
  "legacySubmissionId": 1001
}
```
