# Submission Processor - Create Submission Event only 

This processor only deals with the event when a new submission is created. It carries out additional processing of the uploaded submission


## Dependencies

- [nodejs](https://nodejs.org/en/) (v8+)

## Configuration

Configuration for the notification server is at `config/default.js`.
The following parameters can be set in config files or in env variables:

- LOG_LEVEL: the log level
- KAFKA_URL: comma separated Kafka hosts
- KAFKA_CLIENT_CERT: Kafka connection certificate, optional;
    if not provided, then SSL connection is not used, direct insecure connection is used;
    if provided, it can be either path to certificate file or certificate content
- KAFKA_CLIENT_CERT_KEY: Kafka connection private key, optional;
    if not provided, then SSL connection is not used, direct insecure connection is used;
    if provided, it can be either path to private key file or private key content
- SUBMISSION_CREATE_TOPIC: Kafka topic related to Submission creation, default value is 'submission.notification.create'
- AVSCAN_TOPIC: Kafka topic related to AV Scan, default value is 'avscan.action.scan'
- ACCESS_KEY_ID: the AWS access key id
- SECRET_ACCESS_KEY: the AWS secret access key
- REGION: the AWS region
- DMZ_BUCKET: the DMZ bucket
- CLEAN_BUCKET: the clean bucket
- QUARANTINE_BUCKET: quarantine bucket
- SUBMISSION_API_URL: Submission API URL
- ANTIVIRUS_API_URL: Antivirus API URL

Note that ACCESS_KEY_ID and SECRET_ACCESS_KEY are optional,
if not provided, then they are loaded from shared credentials, see [official documentation](https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/loading-node-credentials-shared.html)

Also note that there is a `/health` endpoint that checks for the health of the app. This sets up an expressjs server and listens on the environment variable `PORT`. It's not part of the configuration file and needs to be passed as an environment variable

## Local Kafka setup

- `http://kafka.apache.org/quickstart` contains details to setup and manage Kafka server,
  below provides details to setup Kafka server in Mac, Windows will use bat commands in bin/windows instead
- download kafka at `https://www.apache.org/dyn/closer.cgi?path=/kafka/1.1.0/kafka_2.11-1.1.0.tgz`
- extract out the downloaded tgz file
- go to extracted directory kafka_2.11-0.11.0.1
- start ZooKeeper server:
  `bin/zookeeper-server-start.sh config/zookeeper.properties`
- use another terminal, go to same directory, start the Kafka server:
  `bin/kafka-server-start.sh config/server.properties`
- note that the zookeeper server is at localhost:2181, and Kafka server is at localhost:9092
- use another terminal, go to same directory, create a topic:
  `bin/kafka-topics.sh --create --zookeeper localhost:2181 --replication-factor 1 --partitions 1 --topic submission.notification.create`
- verify that the topic is created:
  `bin/kafka-topics.sh --list --zookeeper localhost:2181`,
  it should list out the created topics
- run the producer and then type a few messages into the console to send to the server:
  `bin/kafka-console-producer.sh --broker-list localhost:9092 --topic submission.notification.create`
  in the console, write some messages, one per line:

```
{ "topic":"submission.notification.create", "originator":"submission-api", "timestamp":"2018-08-06T15:46:05.575Z", "mime-type":"application/json", "payload":{ "resource":"submission", "id":"a12a4180-65aa-42ec-a945-5fd21dec0502", "url":"https://www.dropbox.com/s/31idvhiz9l7v35k/EICAR_submission.zip?dl=1", "fileType": "zip", "isFileSubmission":false } }

{ "topic":"submission.notification.create", "originator":"submission-api", "timestamp":"2018-08-06T15:46:05.575Z", "mime-type":"application/json", "payload":{ "resource":"submission", "id":"a12a4180-65aa-42ec-a945-5fd21dec0503", "url":"https://drive.google.com/file/d/16kkvI-itLYaH8IuVDrLsRL94t-HK1w19/view?usp=sharing", "fileType": "zip", "isFileSubmission":false } }

```

  we can keep this producer so that we may send more messages later for verification
- optionally, use another terminal, go to same directory, start a consumer to view the messages:
  `bin/kafka-console-consumer.sh --bootstrap-server localhost:9092 --topic submission.notification.create --from-beginning`

## Local deployment

- setup Kafka as above
- install dependencies `npm i`
- run code lint check `npm run lint`, running `npm run lint:fix` can fix some lint errors if any
- start app `npm start`
- use another terminal to start mock submission api `npm run mock-submission-api`
  the mock submission api is running at `http://localhost:3010/api/v5`

- Anti virus API configured using `ANTIVIRUS_API_URL` should be up and running for the application to work properly.

- You can run the Anti virus service locally using the [av-scannner-service](https://github.com/topcoder-platform/av-scanner-service)

## Local Deployment with Docker

To run the Submission ES Processor using docker, follow the below steps

1. Navigate to the directory `docker`

2. Rename the file `sample.api.env` to `api.env`

3. Set the required AWS credentials in the file `api.env`

4. Once that is done, run the following command

```
docker-compose up
```

5. When you are running the application for the first time, It will take some time initially to download the image and install the dependencies

## Unit tests and Integration tests

Ideally, Unit tests should use mocks for all external interactions. In AWS S3 mocks available, there is no option available to return different files based on some conditions, Also for Anti Virus API, there is no identifier to differentiate between good file and infected file to return mock responses.

Hence for unit tests, S3 and Anti virus API should be real and Submission API will be mocked.

Tests uses separate S3 buckets which need to be configured using the environment variables

```
DMZ_BUCKET_TEST
CLEAN_BUCKET_TEST
QUARANTINE_BUCKET_TEST
```

Refer to `config/test.js` for more details. Variables not present in `config/test.js` will flow from `config/default.js`

#### Running unit tests and coverage

To run unit tests alone

```
npm run test
```

To run unit tests with coverage report

```
npm run cov
```

#### Running integration tests and coverage

To run integration tests alone

```
npm run e2e
```

To run integration tests with coverage report

```
npm run cov-e2e
```

## Verification

- start kafka server, start mock submission api, setup 3 AWS S3 buckets and update corresponding config, start processor app, start Anti virus service or configure Remote Anti virus service

- Note: `submission-scanner` app need to be up and running as well to verify the working of `submission-processor`

- use the above kafka-console-producer to write messages to `submission.notification.create` topic, one message per line:

```
{ "topic":"submission.notification.create", "originator":"submission-api", "timestamp":"2018-08-06T15:46:05.575Z", "mime-type":"application/json", "payload":{ "resource":"submission", "id":"a12a4180-65aa-42ec-a945-5fd21dec0502", "url":"https://www.dropbox.com/s/31idvhiz9l7v35k/EICAR_submission.zip?dl=1", "fileType": "zip", "isFileSubmission":false } }

{ "topic":"submission.notification.create", "originator":"submission-api", "timestamp":"2018-08-06T15:46:05.575Z", "mime-type":"application/json", "payload":{ "resource":"submission", "id":"a12a4180-65aa-42ec-a945-5fd21dec0503", "url":"https://drive.google.com/file/d/16kkvI-itLYaH8IuVDrLsRL94t-HK1w19/view?usp=sharing", "fileType": "zip", "isFileSubmission":false } }

```

  similarly add more messages, the files will be moved to clean or quarantine areas depending on the result from Anti virus API
- go to AWS console S3 service, check the 3 buckets contents
- check the mock submission api console, it should say Mock Submission API got some data

