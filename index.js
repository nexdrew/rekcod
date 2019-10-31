'use strict'

// call `docker inspect` for one or more containers
// errback receives an array of "docker run objects"
module.exports = function rekcod (containers, cb) {
  let cbCalled = false
  const stdout = []
  const stderr = []
  const child = require('child_process').spawn('docker', ['inspect'].concat(containers))
  child.stderr.on('data', (data) => {
    stderr.push(data)
  })
  child.stdout.on('data', (data) => {
    stdout.push(data)
  })
  child.on('error', (err) => {
    if (!cbCalled) {
      cbCalled = true
      cb(err)
    }
  })
  child.on('close', (code, signal) => {
    if (cbCalled) return
    if (code !== 0) {
      const err = new Error('docker inspect failed with code ' + code + ' from signal ' + signal)
      err.code = code
      err.signal = signal
      if (stderr.length) err.stderr = stderr.join('')
      if (stdout.length) err.stdout = stdout.join('')
      cbCalled = true
      return cb(err)
    }
    try {
      cb(null, parse(stdout.join('')))
    } catch (err) {
      cb(err)
    }
  })
}

// file should be path to a file containing `docker inspect` output
// errback receives an array of "docker run objects"
module.exports.readFile = function readFile (file, cb) {
  require('fs').readFile(file, { encoding: 'utf8' }, (err, fileContents) => {
    if (err) return cb(err)
    try {
      cb(null, parse(fileContents))
    } catch (err) {
      cb(err)
    }
  })
}

// json string could be an array from `docker inspect` or
// a single inspected object; always returns an array
const parse = module.exports.parse = function parse (jsonString) {
  return [].concat(translate(JSON.parse(jsonString)))
}

// translate a parsed array or object into "docker run objects"
// returns an array if given an array, otherwise returns an object
const translate = module.exports.translate = function translate (parsed) {
  return Array.isArray(parsed) ? parsed.map((o) => toRunObject(o)) : toRunObject(parsed)
}

function toRunObject (inspectObj) {
  const run = {}

  run.image = shortHash(inspectObj.Image)
  run.id = shortHash(inspectObj.Id)

  run.name = inspectObj.Name
  if (run.name && run.name.indexOf('/') === 0) run.name = run.name.substring(1)

  run.command = toRunCommand(inspectObj, run.name)

  return run
}

function shortHash (hash) {
  if (hash && hash.length && hash.length > 12) return hash.substring(0, 12)
  return hash
}

function toRunCommand (inspectObj, name) {
  let rc = append('docker run', '--name', name)

  const hostcfg = inspectObj.HostConfig || {}
  const networkMode = hostcfg.NetworkMode
  const utsMode = hostcfg.UTSMode
  const modes = { networkMode, utsMode }

  rc = appendBoolean(rc, hostcfg.Privileged, '--privileged') // fixes #49
  // TODO something about devices or capabilities instead of privileged?
  // --cap-add: Add Linux capabilities
  // --cap-drop: Drop Linux capabilities
  // --device=[]: Allows you to run devices inside the container without the --privileged flag
  // see https://docs.docker.com/engine/reference/run/#runtime-privilege-and-linux-capabilities

  if (hostcfg.Runtime) rc = append(rc, '--runtime', hostcfg.Runtime)
  rc = appendArray(rc, '-v', hostcfg.Binds)
  rc = appendArray(rc, '--volumes-from', hostcfg.VolumesFrom)
  if (hostcfg.PortBindings && isCompatible('-p', modes)) {
    rc = appendObjectKeys(rc, '-p', hostcfg.PortBindings, (ipPort) => {
      return ipPort.HostIp ? ipPort.HostIp + ':' + ipPort.HostPort : ipPort.HostPort
    })
  }
  rc = appendArray(rc, '--link', hostcfg.Links, (link) => {
    link = link.split(':')
    if (link[0] && ~link[0].lastIndexOf('/')) link[0] = link[0].substring(link[0].lastIndexOf('/') + 1)
    if (link[1] && ~link[1].lastIndexOf('/')) link[1] = link[1].substring(link[1].lastIndexOf('/') + 1)
    return link[0] + ':' + link[1]
  })
  if (hostcfg.PublishAllPorts && isCompatible('-P', modes)) rc = rc + ' -P'

  if (networkMode && networkMode !== 'default') {
    rc = append(rc, '--net', networkMode)
  }
  if (utsMode && isCompatible('--uts', modes)) {
    rc = append(rc, '--uts', utsMode)
  }
  if (hostcfg.RestartPolicy && hostcfg.RestartPolicy.Name) {
    rc = append(rc, '--restart', hostcfg.RestartPolicy, (policy) => {
      return policy.Name === 'on-failure' ? policy.Name + ':' + policy.MaximumRetryCount : policy.Name
    })
  }
  if (isCompatible('--add-host', modes)) rc = appendArray(rc, '--add-host', hostcfg.ExtraHosts) // do not use in container net mode

  const cfg = inspectObj.Config || {}

  if (cfg.Hostname && isCompatible('-h', modes)) rc = append(rc, '-h', cfg.Hostname)
  if (cfg.Domainname && isCompatible('--domainname', modes)) rc = append(rc, '--domainname', cfg.Domainname)

  if (cfg.ExposedPorts && isCompatible('--expose', modes)) {
    rc = appendObjectKeys(rc, '--expose', cfg.ExposedPorts)
  }
  rc = appendArray(rc, '-e', cfg.Env, (env) => '\'' + env.replace(/'/g, '\'\\\'\'') + '\'')
  rc = appendConfigBooleans(rc, cfg)
  if (cfg.Entrypoint) rc = appendJoinedArray(rc, '--entrypoint', cfg.Entrypoint, ' ')

  rc = rc + ' ' + (cfg.Image || inspectObj.Image)

  if (cfg.Cmd) rc = appendJoinedArray(rc, null, cfg.Cmd, ' ')

  return rc
}

// The following options are invalid in 'container' NetworkMode:
// --add-host
// -h, --hostname
// --dns
// --dns-search
// --dns-option
// --mac-address
// -p, --publish
// -P, --publish-all
// --expose
// The following options are invalid in 'host' UTSMode:
// -h, --hostname
// --domainname
function isCompatible (flag, modes) {
  switch (flag) {
    case '-h':
      return !(modes.networkMode || '').startsWith('container:') && modes.utsMode !== 'host'
    case '--add-host':
    case '--dns':
    case '--dns-search':
    case '--dns-option':
    case '--mac-address':
    case '-p':
    case '-P':
    case '--expose':
      return !(modes.networkMode || '').startsWith('container:')
    case '--domainname':
      return modes.utsMode !== 'host'
    default:
      return true
  }
}

function appendConfigBooleans (str, cfg) {
  const stdin = cfg.AttachStdin === true
  const stdout = cfg.AttachStdout === true
  const stderr = cfg.AttachStderr === true
  str = appendBoolean(str, !stdin && !stdout && !stderr, '-d')
  str = appendBoolean(str, stdin, '-a', 'stdin')
  str = appendBoolean(str, stdout, '-a', 'stdout')
  str = appendBoolean(str, stderr, '-a', 'stderr')
  str = appendBoolean(str, cfg.Tty === true, '-t')
  str = appendBoolean(str, cfg.OpenStdin === true, '-i')
  return str
}

function appendBoolean (str, bool, key, val) {
  return bool ? (val ? append(str, key, val) : str + ' ' + key) : str
}

function appendJoinedArray (str, key, array, join) {
  if (!Array.isArray(array)) return str
  return append(str, key, array.join(join), (joined) => {
    return key ? '"' + joined + '"' : joined
  })
}

function appendObjectKeys (str, key, obj, transformer) {
  let newStr = str
  Object.keys(obj).forEach((k) => {
    newStr = append(newStr, key, { key: k, val: obj[k] }, (agg) => {
      if (!agg.val) return agg.key
      let v = ''
      if (Array.isArray(agg.val)) {
        agg.val.forEach((valObj) => {
          v = (typeof transformer === 'function' ? transformer(valObj) : valObj)
        })
      }
      return (v ? v + ':' : '') + agg.key
    })
  })
  return newStr
}

function appendArray (str, key, array, transformer) {
  if (!Array.isArray(array)) return str
  let newStr = str
  array.forEach((v) => {
    newStr = append(newStr, key, v, transformer)
  })
  return newStr
}

function append (str, key, val, transformer) {
  if (!val) return str
  return str + ' ' + (key ? key + ' ' : '') + (typeof transformer === 'function' ? transformer(val) : val)
}
