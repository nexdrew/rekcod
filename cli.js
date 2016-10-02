#!/usr/bin/env node
'use strict'

const rekcod = require('./index')

rekcod(process.argv.slice(2), (err, runObjects) => {
  if (err) {
    if (err.stdout) console.log(err.stdout)
    if (err.stderr) console.error(err.stderr)
    else console.error(err)
    return process.exit((!isNaN(err.code) && err.code) || 1)
  }

  runObjects.forEach((r) => {
    console.log()
    console.log(r.command)
  })
  console.log()
})
