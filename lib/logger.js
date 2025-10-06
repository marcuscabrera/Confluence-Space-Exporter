'use strict'

class Logger {
  constructor (verbose = false) {
    this.verbose = Boolean(verbose)
    this.timers = new Map()
  }

  isVerbose () {
    return this.verbose
  }

  info (...args) {
    console.log(...args)
  }

  warn (...args) {
    console.warn(...args)
  }

  error (...args) {
    console.error(...args)
  }

  debug (...args) {
    if (this.verbose) {
      console.log(...args)
    }
  }

  time (label) {
    if (!this.verbose) {
      return
    }
    const key = String(label)
    this.timers.set(key, process.hrtime.bigint())
    console.log(`[timer:start] ${key}`)
  }

  timeEnd (label) {
    if (!this.verbose) {
      return
    }
    const key = String(label)
    const start = this.timers.get(key)
    if (!start) {
      return
    }
    const end = process.hrtime.bigint()
    const durationMs = Number(end - start) / 1e6
    this.timers.delete(key)
    console.log(`[timer:end] ${key} - ${durationMs.toFixed(2)} ms`)
  }
}

module.exports = Logger
