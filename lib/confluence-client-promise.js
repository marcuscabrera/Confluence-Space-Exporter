/**
 * Confluence promise client
 */

'use strict'

const request = require('request-promise')
const Promise = require('promise')

class ConfluenceClient {
  constructor (protocol, host, port, username, password, logger) {
    this.protocol = protocol
    this.host = host
    this.port = port
    this.username = username
    this.password = password
    this.baseurl = `${this.protocol}://${this.host}:${this.port}`
    this.headers = { 'Content-Type': 'application/json' }
    this.auth = {
      user: this.username,
      password: this.password
    }
    this.logger = logger
    if (this.logger && this.logger.isVerbose()) {
      this.logger.debug('Initialized ConfluenceClient', {
        baseurl: this.baseurl,
        username: this.username
      })
    }
  }

  // API request generator
  async makeRequest (options) {
    try {
      if (this.logger && this.logger.isVerbose()) {
        const safeOptions = {
          method: options.method,
          url: options.url,
          headers: options.headers,
          hasBody: Boolean(options.body)
        }
        this.logger.debug('Sending request to Confluence API', safeOptions)
      }
      const response = await request(options)
      if (this.logger && this.logger.isVerbose()) {
        this.logger.debug('Received response from Confluence API', {
          url: options.url,
          status: response && response.statusCode ? response.statusCode : 'success',
          type: typeof response
        })
      }
      return response
    } catch (err) {
      if (this.logger) {
        this.logger.error('Confluence API request failed')
        if (this.logger.isVerbose() && err && err.stack) {
          this.logger.error(err.stack)
        } else {
          this.logger.error(err && err.message ? err.message : err)
        }
      } else {
        console.log(err.message)
      }
      process.exit(1)
    }
  }

  // Get a space
  // Params:
  // key - space key
  getSpace (params) {
    const options = {
      url: `${this.baseurl}/rest/api/space/${params.key}`,
      method: 'GET',
      headers: this.headers,
      auth: this.auth,
      json: true
    }
    return this.makeRequest(options)
  }

  // Set a space status to archive
  // Params:
  // key - space key
  archiveSpace (params) {
    const options = {
      url: `${this.baseurl}/rpc/json-rpc/confluenceservice-v2/setSpaceStatus`,
      method: 'POST',
      headers: this.headers,
      auth: this.auth,
      body: `[ "${params.key}", "ARCHIVED" ]`
    }
    return this.makeRequest(options)
  }

  // Export a space to XML or HTML file
  // Params:
  // key - space key
  // type - export file type (TYPE_XML or TYPE_HTML)
  exportSpace (params) {
    const options = {
      url: `${this.baseurl}/rpc/json-rpc/confluenceservice-v2/exportSpace`,
      method: 'POST',
      headers: this.headers,
      auth: this.auth,
      timeout: 600000,
      body: `["${params.key}", "${params.type}", "true"]`
    }
    return this.makeRequest(options)
  }

  // Params:
  // key - space key
  exportSpace2Xml (params) {
    return this.exportSpace({ key: params.key, type: 'TYPE_XML' })
  }

  // Params:
  // key - space key
  exportSpace2Html (params) {
    return this.exportSpace({ key: params.key, type: 'TYPE_HTML' })
  }

  // Retrive token to access plugin
  async pluginLogin () {
    if (this.logger && this.logger.isVerbose()) {
      this.logger.debug('Authenticating via Confluence PDF export plugin')
    }
    const loginString = '<soapenv:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:rpc="http://rpc.confluence.atlassian.com">' +
    '<soapenv:Header/>' +
    '<soapenv:Body>' +
    '<rpc:login soapenv:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">' +
    '<in0 xsi:type="xsd:string">' + this.username + '</in0>' +
    '<in1 xsi:type="xsd:string">' + this.password + '</in1>' +
    '</rpc:login>' +
    '</soapenv:Body>' +
    '</soapenv:Envelope>'
    const options = {
      url: `${this.baseurl}/plugins/servlet/soap-axis1/pdfexport`,
      method: 'POST',
      headers: { 'Content-Type': 'text/html', 'SOAPAction': '' },
      auth: this.auth,
      body: loginString
    }
    const data = await this.makeRequest(options)
    const pattern = /xsd:string">(.*)<\/loginReturn/
    const token = data.match(pattern)[1]
    if (this.logger && this.logger.isVerbose()) {
      this.logger.debug('Authentication token retrieved successfully')
    }
    return token
  }

  // Export a space to PDF file
  // Params:
  // key - space key
  async exportSpace2Pdf (params) {
    const token = await this.pluginLogin()
    const exportPdfString = '<soapenv:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:rpc="http://rpc.flyingpdf.extra.confluence.atlassian.com">' +
    '<soapenv:Header/>' +
    '<soapenv:Body>' +
    '<rpc:exportSpace soapenv:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">' +
    '<in0 xsi:type="xsd:string">' + token + '</in0>' +
    '<in1 xsi:type="xsd:string">' + params.key + '</in1>' +
    '</rpc:exportSpace>' +
    '</soapenv:Body>' +
    '</soapenv:Envelope>'
    const options = {
      url: `${this.baseurl}/plugins/servlet/soap-axis1/pdfexport`,
      method: 'POST',
      headers: { 'Content-Type': 'text/html', 'SOAPAction': '' },
      timeout: 600000,
      body: exportPdfString
    }
    const data = await this.makeRequest(options)
    const pattern = /xsd:string">(.*)<\/exportSpaceReturn/
    const downloadLink = data.match(pattern)[1]
    if (this.logger && this.logger.isVerbose()) {
      this.logger.debug('PDF export download link retrieved', downloadLink)
    }
    return downloadLink
  }

}

module.exports = ConfluenceClient
