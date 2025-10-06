'use strict'

const ConfluenceClient = require('./confluence-client-promise')
const Promise = require('promise')
const fs = require('fs')
const path = require('path')
const request = require('request')
const moment = require('moment')
const Logger = require('./logger')

function downloadProgress (logger, key, received, total) {
  const percentage = ((received * 100) / total).toFixed(2)
  logger.info(percentage + ' % has been downloaded for ' + key)
  logger.debug(`Download progress for ${key}: ${received} of ${total} bytes`)
}

async function downloadExportFile (logger, confluence, key, type, downloadLink) {
  logger.time(`download:${key}`)
  return new Promise(async function (resolve, reject) {
    try {
      logger.debug('Fetching space details to determine export file path')
      const spaceDetail = await confluence.getSpace({ key: key })
      logger.debug('Space details received', spaceDetail)
      let savePath = path.join(process.env.HOST + '-' + key + '-' + spaceDetail.name.replace(/[^A-Z0-9]/ig, '_') + '.' + type + '.zip')
      if (type === 'pdf') {
        savePath = path.join(process.env.HOST + '-' + key + '-' + spaceDetail.name.replace(/[^A-Z0-9]/ig, '_') + '.pdf')
      }
      logger.debug('Resolved save path for export', savePath)
      const writer = fs.createWriteStream(savePath)
      let receivedBytes = 0
      let totalBytes = 0
      const options = {
        url: downloadLink,
        headers: { 'Content-Type': 'application/json' },
        auth: {
          user: process.env.USERNAME,
          password: process.env.PASSWORD
        }
      }
      logger.debug('Initiating file download with options', {
        method: 'GET',
        url: options.url,
        headers: options.headers
      })
      request
        .get(options)
        .on('error', function (err) {
          logger.error('Oops, something went wrong during download.')
          if (logger.isVerbose() && err && err.stack) {
            logger.error(err.stack)
          } else {
            logger.error(err && err.message ? err.message : err)
          }
          logger.timeEnd(`download:${key}`)
          reject(err)
        })
        .on('response', function (data) {
          logger.info('status code is:', data.statusCode)
          if (data.statusCode !== 200) {
            logger.timeEnd(`download:${key}`)
            reject('status code is: ' + data.statusCode)
          } else {
            totalBytes = data.headers['content-length']
            logger.info(key, 'space export file size:', (data.headers['content-length'] / 1048576).toFixed(2), 'MB')
            logger.debug('Response headers:', data.headers)
          }
        })
        .on('data', function (chunk) {
          receivedBytes += chunk.length
          downloadProgress(logger, key, receivedBytes, totalBytes)
        })
        .on('end', function () {
          logger.timeEnd(`download:${key}`)
          if ((totalBytes / 1048576).toFixed(2) > 0) {
            logger.info(key, 'space download finished!', savePath)
            logger.info(key, 'space download ending time:', moment().format('YYYY-MM-DD hh:mm:ss'))
            resolve()
          } else {
            reject('File size does not look right, is it a empty space?')
          }
        })
        .pipe(writer)
    } catch (err) {
      logger.error('Failed to prepare download for space', key)
      if (logger.isVerbose() && err && err.stack) {
        logger.error(err.stack)
      } else {
        logger.error(err && err.message ? err.message : err)
      }
      logger.timeEnd(`download:${key}`)
      reject(err)
    }
  })
}

async function exportSpace (key, type, options = {}) {
  const logger = options.logger instanceof Logger ? options.logger : new Logger(options.verbose)
  logger.time(`export:total:${key}`)
  try {
    if (logger.isVerbose()) {
      logger.debug('Verbose mode enabled. Runtime configuration:', {
        protocol: process.env.PROTOCOL,
        host: process.env.HOST,
        port: process.env.PORT,
        username: process.env.USERNAME,
        exportType: type
      })
    }

    logger.info('Generating export file for space', key, '...')
    if (!type || typeof type !== 'string' || !['xml', 'pdf', 'html'].includes(type.toLowerCase())) {
      logger.error('Error: The export file type can only be xml, html or pdf.')
      process.exit(1)
    }

    const confluence = new ConfluenceClient(process.env.PROTOCOL, process.env.HOST, process.env.PORT, process.env.USERNAME, process.env.PASSWORD, logger)
    let downloadLink = ''

    const normalizedType = type.toLowerCase()

    logger.time(`export:generate:${key}`)
    if (normalizedType === 'xml') {
      logger.debug('Requesting XML export via Confluence API')
      downloadLink = await confluence.exportSpace2Xml({ key: key })
      logger.debug('Raw XML export response:', downloadLink)
      downloadLink = JSON.parse(downloadLink)
      logger.debug('Parsed XML export response:', downloadLink)
    }
    if (normalizedType === 'html') {
      logger.debug('Requesting HTML export via Confluence API')
      downloadLink = await confluence.exportSpace2Html({ key: key })
      logger.debug('Raw HTML export response:', downloadLink)
      downloadLink = JSON.parse(downloadLink)
      logger.debug('Parsed HTML export response:', downloadLink)
    }
    if (normalizedType === 'pdf') {
      logger.debug('Requesting PDF export via Confluence API')
      downloadLink = await confluence.exportSpace2Pdf({ key: key })
      logger.debug('PDF export response (download link):', downloadLink)
    }
    logger.timeEnd(`export:generate:${key}`)

    const linkForDownload = typeof downloadLink === 'object' && downloadLink.downloadLink ? downloadLink.downloadLink : downloadLink

    logger.info(key, 'space archiving file download link:', linkForDownload)
    logger.info(key, 'space download starting time:', moment().format('YYYY-MM-DD hh:mm:ss'), '\nDownloading...')

    await downloadExportFile(logger, confluence, key, normalizedType, linkForDownload)
  } catch (err) {
    logger.error('Oops, something went wrong')
    if (logger.isVerbose() && err && err.stack) {
      logger.error(err.stack)
    } else {
      logger.error(err && err.message ? err.message : err)
    }
    process.exit(1)
  } finally {
    logger.timeEnd(`export:total:${key}`)
  }
}

module.exports = exportSpace
