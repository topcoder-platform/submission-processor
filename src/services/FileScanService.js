/**
 * Service for scanning file.
 */

/**
 * Scan file. Return whether the file is ok.
 * @param {Object} file the file data to scan, it is response of AWS S3 getObject function,
 *                 e.g. file.data is the file content, file.ContentType is MIME type
 * @returns {Boolean} true if the file is ok, false otherwise
 */
function * scanFile (file) {
  // simply return random result
  return Math.random() > 0.5
}

// Exports
module.exports = {
  scanFile
}
