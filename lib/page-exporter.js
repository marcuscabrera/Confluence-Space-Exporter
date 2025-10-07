'use strict'

const fs = require('fs')
const path = require('path')
const request = require('request')
const ConfluenceClient = require('./confluence-client-promise')
const Logger = require('./logger')

const fsPromises = fs.promises

function sanitizeForFilename (name) {
  if (!name || typeof name !== 'string') {
    return 'page'
  }
  return name
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .substring(0, 120) || 'page'
}

async function ensureDir (dir) {
  await fsPromises.mkdir(dir, { recursive: true })
}

async function writeHtmlFile (logger, targetPath, html) {
  await fsPromises.writeFile(targetPath, html, 'utf8')
  logger.debug('Wrote HTML file', targetPath)
}

async function downloadPdf (logger, confluence, pageId, targetPath) {
  logger.debug('Downloading PDF for page', pageId, 'to', targetPath)
  return new Promise((resolve, reject) => {
    const writer = fs.createWriteStream(targetPath)
    const options = {
      url: `${confluence.baseurl}/spaces/flyingpdf/pdfpageexport.action`,
      qs: { pageId },
      auth: confluence.auth,
      headers: { 'Content-Type': 'application/pdf' }
    }

    request
      .get(options)
      .on('response', (response) => {
        logger.debug('PDF response status for page', pageId, response.statusCode)
        if (response.statusCode !== 200) {
          const error = new Error(`Failed to export PDF for page ${pageId}: HTTP ${response.statusCode}`)
          writer.destroy(error)
          reject(error)
        }
      })
      .on('error', (err) => {
        reject(err)
      })
      .pipe(writer)

    writer.on('finish', resolve)
    writer.on('error', reject)
  })
}

async function resolvePage (logger, confluence, identifier, spaceKey) {
  const isNumericId = /^\d+$/.test(identifier)
  if (isNumericId) {
    try {
      return await confluence.getPageById({ id: identifier, expand: 'space,body.export_view,ancestors' })
    } catch (err) {
      if (err && err.statusCode === 404) {
        logger.error(`Page with ID ${identifier} was not found.`)
        process.exit(1)
      }
      throw err
    }
  }

  if (!spaceKey) {
    logger.error('When using --page with a title, the --key option must also be provided to identify the space.')
    process.exit(1)
  }

  const pages = await confluence.findPagesByTitle({
    title: identifier,
    spaceKey,
    expand: 'space,body.export_view,ancestors',
    limit: 25
  })

  if (!pages || pages.length === 0) {
    logger.error(`Page titled "${identifier}" was not found in space ${spaceKey}.`)
    process.exit(1)
  }

  if (pages.length > 1) {
    logger.error(`Multiple pages titled "${identifier}" were found in space ${spaceKey}. Please disambiguate by using the page ID.`)
    pages.forEach((page) => {
      logger.error(`- ID: ${page.id} | Title: ${page.title}`)
    })
    process.exit(1)
  }

  return pages[0]
}

async function fetchChildren (logger, confluence, pageId) {
  try {
    return await confluence.getChildPages({ id: pageId, expand: 'space,body.export_view' })
  } catch (err) {
    if (err && err.statusCode === 404) {
      logger.warn(`Unable to retrieve children for page ${pageId}: ${err.message}`)
      return []
    }
    throw err
  }
}

async function exportPageContent ({
  logger,
  confluence,
  page,
  type,
  targetDir,
  withChildren
}) {
  logger.info(`Exporting page "${page.title}" (ID: ${page.id})`)
  logger.time(`page:${page.id}`)

  const sanitizedName = sanitizeForFilename(page.title)
  const pageDir = targetDir
  await ensureDir(pageDir)

  if (type === 'html') {
    let html = page.body && page.body.export_view ? page.body.export_view.value : null
    if (!html) {
      const refreshedPage = await confluence.getPageById({ id: page.id, expand: 'body.export_view' })
      html = refreshedPage && refreshedPage.body && refreshedPage.body.export_view ? refreshedPage.body.export_view.value : ''
    }
    const htmlPath = path.join(pageDir, 'index.html')
    await writeHtmlFile(logger, htmlPath, html || '<html><body><p>(empty page)</p></body></html>')
  } else if (type === 'pdf') {
    const pdfPath = path.join(pageDir, `${sanitizedName || 'page'}-${page.id}.pdf`)
    await downloadPdf(logger, confluence, page.id, pdfPath)
  } else {
    throw new Error(`Unsupported export type for page export: ${type}`)
  }

  logger.timeEnd(`page:${page.id}`)

  if (!withChildren) {
    return
  }

  const children = await fetchChildren(logger, confluence, page.id)
  if (!children || children.length === 0) {
    logger.debug(`No child pages found for page ${page.id}`)
    return
  }

  logger.info(`Found ${children.length} child page${children.length === 1 ? '' : 's'} for "${page.title}"`)

  for (const child of children) {
    const childDirName = `${sanitizeForFilename(child.title)}-${child.id}`
    const childDir = path.join(pageDir, childDirName)
    await exportPageContent({
      logger,
      confluence,
      page: child,
      type,
      targetDir: childDir,
      withChildren
    })
  }
}

async function exportPage (options = {}) {
  const logger = options.logger instanceof Logger ? options.logger : new Logger(options.verbose)

  const requiredEnvVars = ['PROTOCOL', 'HOST', 'PORT', 'USERNAME', 'PASSWORD']
  const missingEnvVars = requiredEnvVars.filter((key) => !process.env[key])

  if (missingEnvVars.length > 0) {
    logger.error('Missing required environment variables to connect to Confluence:', missingEnvVars.join(', '))
    process.exit(1)
  }

  const type = (options.type || '').toLowerCase()
  if (!['html', 'pdf'].includes(type)) {
    logger.error('Error: Individual page export only supports html or pdf output types.')
    process.exit(1)
  }

  const pageIdentifier = options.page && typeof options.page === 'string' ? options.page.trim() : String(options.page || '').trim()

  if (!pageIdentifier) {
    logger.error('The --page option must be provided to export a specific page.')
    process.exit(1)
  }

  logger.time('page-export:total')

  try {
    const confluence = new ConfluenceClient(
      process.env.PROTOCOL,
      process.env.HOST,
      process.env.PORT,
      process.env.USERNAME,
      process.env.PASSWORD,
      logger
    )

    const page = await resolvePage(logger, confluence, pageIdentifier, options.key)

    const spaceKey = page.space && page.space.key ? page.space.key : options.key || 'page'
    const rootDirName = `${process.env.HOST}-${spaceKey}-page-${sanitizeForFilename(page.title)}-${page.id}`
    const rootDir = path.resolve(rootDirName)
    await ensureDir(rootDir)

    logger.info(`Saving export to ${rootDir}`)

    await exportPageContent({
      logger,
      confluence,
      page,
      type,
      targetDir: rootDir,
      withChildren: Boolean(options.withChildren)
    })
  } catch (err) {
    logger.error('Failed to export page.')
    if (logger.isVerbose() && err && err.stack) {
      logger.error(err.stack)
    } else if (err && err.message) {
      logger.error(err.message)
    } else {
      logger.error(err)
    }
    process.exit(1)
  } finally {
    logger.timeEnd('page-export:total')
  }
}

module.exports = exportPage
