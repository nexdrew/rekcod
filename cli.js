#!/usr/bin/env node
'use strict'

let args = process.argv.slice(2)

if (!args.length) {
  // grab args from stdin
  let read = ''
  process.stdin.resume()
  process.stdin.setEncoding('utf8')
  process.stdin.on('data', function (chunk) {
    read += chunk
  })
  process.stdin.on('end', function () {
    try {
      args = [ JSON.parse(read) ] // either pipe json blob in from docker inspect
    } catch (_) {
      args = read.match(/\S+/g) || process.exit(0) // or pipe container ids from docker ps
    }
    processArgs(args)
  })
} else {
  processArgs(args)
}

function processArgs (args) {
  const rekcod = require('./index')
  const fs = require('fs')
  // determine if each arg represents a container, a file, or json
  // collect containers so they can be processed together
  const containers = []
  const objects = args.map((arg, index) => {
    if (typeof arg === 'object') return { index, type: 'json', val: arg }
    try {
      return { index, type: 'json', val: JSON.parse(arg) }
    } catch (_) {}
    try {
      return { index, type: 'file', val: fs.statSync(arg) && arg }
    } catch (_) {}
    containers.push({ index, type: 'container', val: arg })
    return null
  })

  // asynchronously process each object and all containers
  let containersRunning = false
  if (containers.length) {
    containersRunning = true
    rekcod(containers.map((c) => c.val), (err, runObjects) => {
      handleError(err)
      for (let i = 0, len = runObjects.length, c; i < len; i++) {
        c = containers[i]
        c.run = [ runObjects[i] ]
        objects[c.index] = c
      }
      containersRunning = false
    })
  }
  let filesRunning = 0
  objects.filter(Boolean).forEach((o) => {
    if (o.type === 'json') {
      o.run = [].concat(rekcod.translate(o.val))
    } else if (o.type === 'file') {
      filesRunning++
      rekcod.readFile(o.val, (err, runObjects) => {
        handleError(err)
        o.run = runObjects
        filesRunning--
      })
    }
  })

  function checkCompletion () {
    if (!containersRunning && filesRunning === 0) {
      objects.forEach((o) => {
        if (!o || !Array.isArray(o.run) || o.run.length === 0) {
          console.log()
          return console.log('Nothing to translate')
        }
        o.run.forEach((r) => {
          console.log()
          console.log(r.command)
        })
      })
      return console.log()
    }
    setTimeout(checkCompletion, 20) // check up to 50 times a second
  }
  checkCompletion()
}

function handleError (err) {
  if (!err) return
  if (err.stdout) console.log(err.stdout)
  if (err.stderr) console.error(err.stderr)
  else console.error(err)
  process.exit((!isNaN(err.code) && err.code) || 1)
}
