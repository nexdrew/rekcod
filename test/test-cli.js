'use strict'

const execFileSync = require('child_process').execFileSync
const path = require('path')
const test = require('tape')

const cliPath = path.resolve(__dirname, '..', 'cli.js')

function mockedDockerEnv (envPath) {
  const env = JSON.parse(JSON.stringify(process.env))
  env.PATH = envPath || [__dirname].concat(env.PATH.split(path.delimiter)).join(path.delimiter)
  return env
}

function cli (args, envPath) {
  return execFileSync(cliPath, args.split(/\s/), {
    env: mockedDockerEnv(envPath),
    encoding: 'utf8'
  })
}

test('cli works for docker inspect happy path', (t) => {
  const dockerRunCommands = cli('one two')
  const expected = '\n' +
    'docker run ' +
    '--name project_service_1 ' +
    '-v /var/lib/replicated:/var/lib/replicated -v /proc:/host/proc:ro ' +
    '-p 4700:4700/tcp -p 4702:4702/tcp ' +
    '--link project_postgres_1:postgres --link project_rrservice_1:project_rrservice_1 ' +
    '-P ' +
    '--net host ' +
    '--restart on-failure:5 ' +
    '--add-host xyz:1.2.3.4 --add-host abc:5.6.7.8 ' +
    '-h 9c397236341e ' +
    '--expose 4700/tcp --expose 4702/tcp ' +
    '-e DB_USER=postgres -e "no_proxy=*.local, 169.254/16" ' +
    '-d ' +
    '--entrypoint "tini -- /docker-entrypoint.sh" ' +
    'project_service /etc/npme/start.sh -g' +
    '\n\n' +
    'docker run ' +
    '--name hello ' +
    '--volumes-from admiring_brown --volumes-from silly_jang ' +
    '--restart no ' +
    '-h 46d567b2ef86 ' +
    '-e PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin ' +
    '-a stdout -a stderr ' +
    '-t -i ' +
    'hello-world /hello' +
    '\n\n'
  t.equal(dockerRunCommands, expected)
  t.end()
})

test('cli handles docker inspect invalid json', (t) => {
  let err
  try {
    cli('invalid')
  } catch (e) {
    err = e
  }
  t.ok(err)
  t.ok(/Unexpected token d/.test(err.stderr))
  t.equal(err.status, 1)
  t.end()
})

test('cli handles docker inspect empty array', (t) => {
  let err
  try {
    cli('empty')
  } catch (e) {
    err = e
  }
  t.ok(err)
  t.ok(/Unexpected output/.test(err.stderr))
  t.equal(err.status, 1)
  t.end()
})

test('cli handles docker inspect error', (t) => {
  let err
  try {
    cli('error')
  } catch (e) {
    err = e
  }
  t.ok(err)
  t.equal(err.stdout, 'Preparing to error out\n\n')
  t.equal(err.stderr, 'An error has occurred\n\n')
  t.equal(err.status, 127)
  t.end()
})

test('cli handles no docker', (t) => {
  let err
  try {
    cli('dne', '/dne')
  } catch (e) {
    err = e
  }
  t.ok(err)
  t.ok(/spawn docker ENOENT/.test(err.stderr))
  t.equal(err.status, 1)
  t.end()
})
