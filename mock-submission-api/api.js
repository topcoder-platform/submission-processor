/**
 * The application entry point
 */
const express = require('express')
const cors = require('cors')
const bodyParser = require('body-parser')
const logger = require('../src/common/logger')

const app = express()
app.set('port', process.env.MOCK_SUBMISSION_API_PORT || 3010)

app.use(cors())
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

app.post('/api/v5/reviews', (req, res) => {
  logger.info('Mock Submission API got data:')
  logger.info(JSON.stringify(req.body, null, 4))
  res.status(200).end()
})

app.patch('/api/v5/submissions/:submissionId', (req, res) => {
  logger.info('Mock Submission API got data:')
  logger.info(JSON.stringify(req.body, null, 4))
  res.status(200).end()
})

app.use((req, res) => {
  res.status(404).json({ error: 'route not found' })
})

app.use((err, req, res, next) => {
  logger.logFullError(err)
  res.status(500).json({
    error: err.message
  })
})

app.listen(app.get('port'), () => {
  logger.info(`Express server listening on port ${app.get('port')}`)
})
