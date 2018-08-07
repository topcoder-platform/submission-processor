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
- KAFKA_SUBMISSION_TOPIC: the Kafka topic to consume submission messages
- ACCESS_KEY_ID: the AWS access key id
- SECRET_ACCESS_KEY: the AWS secret access key
- REGION: the AWS region
- DMZ_BUCKET: the DMZ bucket
- CLEAN_BUCKET: the clean bucket
- QUARANTINE_BUCKET: quarantine bucket
- REVIEW_API_URL: the review API URL
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
  `bin/kafka-topics.sh --create --zookeeper localhost:2181 --replication-factor 1 --partitions 1 --topic submissions`
- verify that the topic is created:
  `bin/kafka-topics.sh --list --zookeeper localhost:2181`,
  it should list out the created topics
- run the producer and then type a few messages into the console to send to the server:
  `bin/kafka-console-producer.sh --broker-list localhost:9092 --topic submissions`
  in the console, write some messages, one per line:

```
{ "topic":"submission.notification.create", "originator":"submission-api", "timestamp":"2018-08-06T15:46:05.575Z", "mime-type":"application/json", "payload":{ "resource":"submission", "id":"29da63f2-d0f8-4b8f-89d5-192a3aa22774", "url":"https://thumb.ibb.co/jkefXT/t.png", "isFileSubmission":false } }

{ "topic":"submission.notification.create", "originator":"submission-api", "timestamp":"2018-08-06T15:46:05.575Z", "mime-type":"application/json", "payload":{ "resource":"submission", "id":"29da63f2-d0f8-4b8f-89a5-192a3aa23423", "url":"https://drive.google.com/file/d/16kkvI-itLYaH8IuVDrLsRL94t-HK1w19/view?usp=sharing", "fileType": "zip", "isFileSubmission":false } }

```

  we can keep this producer so that we may send more messages later for verification
- optionally, use another terminal, go to same directory, start a consumer to view the messages:
  `bin/kafka-console-consumer.sh --bootstrap-server localhost:9092 --topic submissions --from-beginning`

## Local deployment

- setup Kafka as above
- install dependencies `npm i`
- run code lint check `npm run lint`, running `npm run lint:fix` can fix some lint errors if any
- start app `npm start`
- use another terminal to start mock review api `npm run mock-review-api`
  the mock review api is running at `http://localhost:5000`

## Verification

- start kafka server, start mock review api, setup 3 AWS S3 buckets and update corresponding config, start processor app
- use the above kafka-console-producer to write messages to `submissions` topic, one message per line:
 
```
{ "topic":"submission.notification.create", "originator":"submission-api", "timestamp":"2018-08-06T15:46:05.575Z", "mime-type":"application/json", "payload":{ "resource":"submission", "id":"29da63f2-d0f8-4b8f-89d5-192a3aa22774", "url":"https://thumb.ibb.co/jkefXT/t.png", "fileType": "png", "isFileSubmission":false } }

{ "topic":"submission.notification.create", "originator":"submission-api", "timestamp":"2018-08-06T15:46:05.575Z", "mime-type":"application/json", "payload":{ "resource":"submission", "id":"29da63f2-d0f8-4b8f-89a5-192a3aa23423", "url":"https://drive.google.com/file/d/16kkvI-itLYaH8IuVDrLsRL94t-HK1w19/view?usp=sharing", "fileType": "zip", "isFileSubmission":false } }

```
  
  similarly add more messages, the files will be moved to clean or quarantine areas depending on the result from Anti virus API
- go to AWS console S3 service, check the 3 buckets contents
- check the mock review api console, it should say getting some review data
