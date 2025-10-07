'use strict'

const ConfluenceClient = require('./confluence-client-promise')
const Logger = require('./logger')

function renderTable (spaces) {
  const headers = ['Key', 'Nome', 'Tipo']
  const rows = spaces.map(space => [
    space.key || '-',
    space.name || '-',
    space.type || '-'
  ])

  const columnWidths = headers.map((header, columnIndex) => {
    const maxRowWidth = rows.reduce((max, row) => {
      const cell = row[columnIndex]
      const length = cell ? cell.toString().length : 0
      return Math.max(max, length)
    }, 0)
    return Math.max(header.length, maxRowWidth)
  })

  const formatRow = (cells) => cells
    .map((cell, columnIndex) => {
      const value = cell == null ? '' : cell.toString()
      return value.padEnd(columnWidths[columnIndex])
    })
    .join('  ')

  const separator = columnWidths
    .map((width) => '-'.repeat(width))
    .join('  ')

  console.log(formatRow(headers))
  console.log(separator)
  rows.forEach((row) => console.log(formatRow(row)))
}

async function listSpaces (options = {}) {
  const logger = options.logger instanceof Logger ? options.logger : new Logger(options.verbose)

  try {
    const requiredEnvVars = ['PROTOCOL', 'HOST', 'PORT', 'USERNAME', 'PASSWORD']
    const missingEnvVars = requiredEnvVars.filter((key) => !process.env[key])

    if (missingEnvVars.length > 0) {
      logger.error('Missing required environment variables to connect to Confluence:', missingEnvVars.join(', '))
      process.exit(1)
    }

    if (logger.isVerbose()) {
      logger.debug('Listing spaces with configuration', {
        protocol: process.env.PROTOCOL,
        host: process.env.HOST,
        port: process.env.PORT,
        username: process.env.USERNAME
      })
    }

    const confluence = new ConfluenceClient(
      process.env.PROTOCOL,
      process.env.HOST,
      process.env.PORT,
      process.env.USERNAME,
      process.env.PASSWORD,
      logger
    )

    logger.info('Consulting Confluence for accessible spaces...')
    logger.time('spaces:list')
    const spaces = await confluence.getAllSpaces({ limit: 100 })
    logger.timeEnd('spaces:list')

    if (!Array.isArray(spaces) || spaces.length === 0) {
      logger.error('No spaces were returned by Confluence for the authenticated user.')
      process.exit(1)
    }

    logger.info(`Found ${spaces.length} space${spaces.length === 1 ? '' : 's'}:\n`)
    renderTable(spaces)
    return spaces
  } catch (err) {
    logger.error('Failed to list Confluence spaces.')
    if (logger.isVerbose() && err && err.stack) {
      logger.error(err.stack)
    } else if (err && err.message) {
      logger.error(err.message)
    } else {
      logger.error(err)
    }
    process.exit(1)
  }
}

module.exports = listSpaces
