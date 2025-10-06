#!/usr/bin/env node
"use strict";
/**
 * Confluence Space Exporter Starter
 */

const fs = require('fs')
const path = require('path')
const yargs = require('yargs')

const argv = yargs
  .usage('Usage: $0 -k [key] -t [type]')
  .example('$0 -k CAP -t xml', 'Export Confluence space CAP to XML file')
  .example('$0 --envvar ./envvar -k CAP -t xml', 'Export space using variables from the specified file')
  .alias('k', 'key')
  .describe('k', 'Confluence space key')
  .alias('t', 'type')
  .describe('t', 'Export file type: xml, html or pdf')
  .option('v', {
    alias: 'verbose',
    describe: 'Enable verbose logging output',
    type: 'boolean',
    default: false
  })
  .option('e', {
    alias: 'envvar',
    describe: 'Path to environment variables file',
    type: 'string'
  })
  .demandOption(['k', 't'])
  .argv

if (argv.envvar) {
  const envFilePath = path.resolve(argv.envvar)
  if (!fs.existsSync(envFilePath)) {
    console.error('Error: The environment variables file does not exist:', envFilePath)
    process.exit(1)
  }

  try {
    const envFileContent = fs.readFileSync(envFilePath, 'utf8')
    envFileContent.split(/\r?\n/).forEach((line) => {
      const trimmedLine = line.trim()

      if (!trimmedLine || trimmedLine.startsWith('#')) {
        return
      }

      const match = trimmedLine.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)

      if (!match) {
        return
      }

      const key = match[1]
      let value = match[2].trim()

      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1)
      }

      process.env[key] = value
    })
  } catch (error) {
    console.error('Error loading environment variables file:', error.message)
    process.exit(1)
  }
}

const exporter = require('./lib/exporter')

exporter(argv.key, argv.type, { verbose: argv.verbose })
