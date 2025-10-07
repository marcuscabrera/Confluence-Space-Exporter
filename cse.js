#!/usr/bin/env node
"use strict";
/**
 * Confluence Space Exporter Starter
 */

const fs = require('fs')
const path = require('path')
const yargs = require('yargs')

const argv = yargs
  .usage('Usage: $0 -k [key] -t [type] | --list-spaces | --page [id|title] -t [type]')
  .example('$0 -k CAP -t xml', 'Export Confluence space CAP to XML file')
  .example('$0 --page "Página X" --with-children -t html -k CAP', 'Export a single page and its descendants')
  .example('$0 --envvar ./envvar -k CAP -t xml', 'Export space using variables from the specified file')
  .alias('k', 'key')
  .describe('k', 'Confluence space key')
  .alias('t', 'type')
  .describe('t', 'Export file type: xml, html or pdf')
  .option('l', {
    alias: 'list-spaces',
    describe: 'List spaces accessible to the authenticated user',
    type: 'boolean',
    default: false
  })
  .option('p', {
    alias: 'page',
    describe: 'Page ID or title to export individually',
    type: 'string'
  })
  .option('c', {
    alias: 'with-children',
    describe: 'Include all descendant pages recursively when exporting a single page',
    type: 'boolean',
    default: false
  })
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
  .check((parsedArgv) => {
    if (parsedArgv.listSpaces) {
      return true
    }

    if (parsedArgv.page) {
      if (!parsedArgv.type) {
        throw new Error('Error: The option --type is required when exporting a page.')
      }
      return true
    }

    if (!parsedArgv.key || !parsedArgv.type) {
      throw new Error('Error: The options --key and --type are required unless --list-spaces or --page is used.')
    }

    return true
  })
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
const exportPage = require('./lib/page-exporter')
const listSpaces = require('./lib/list-spaces')

if (argv.listSpaces) {
  listSpaces({ verbose: argv.verbose })
    .catch((err) => {
      // listSpaces already logs errors, but ensure non-zero exit code
      if (err && err.message) {
        console.error(err.message)
      }
      process.exit(1)
    })
} else if (argv.page) {
  exportPage({
    key: argv.key,
    page: argv.page,
    type: argv.type,
    withChildren: argv.withChildren,
    verbose: argv.verbose
  })
} else {
  exporter(argv.key, argv.type, { verbose: argv.verbose })
}
