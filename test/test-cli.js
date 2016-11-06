'use strict'

const childProcess = require('child_process')
const execFileSync = childProcess.execFileSync
const path = require('path')
const test = require('tape')

const cliPath = path.resolve(__dirname, '..', 'cli.js')
const oneTwoFixture = path.resolve(__dirname, 'fixtures', 'inspect-one-two.json')

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

const expectedOneTwo = '\n' +
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

test('cli works for docker inspect happy path', (t) => {
  const dockerRunCommands = cli('one two')
  t.equal(dockerRunCommands, expectedOneTwo)
  t.end()
})

test('cli accepts file name arg', (t) => {
  const dockerRunCommands = cli(oneTwoFixture)
  t.equal(dockerRunCommands, expectedOneTwo)
  t.end()
})

test('pipe json to cli', (t) => {
  childProcess.exec(`cat ${oneTwoFixture} | ${cliPath}`, (err, stdout, stderr) => {
    t.notOk(err)
    t.equal(stdout, expectedOneTwo)
    t.end()
  })
})

test('pipe file name to cli', (t) => {
  childProcess.exec(`ls ${oneTwoFixture} | ${cliPath}`, (err, stdout, stderr) => {
    t.notOk(err)
    t.equal(stdout, expectedOneTwo)
    t.end()
  })
})

test('pipe container ids to cli', (t) => {
  childProcess.exec(`echo 'one two' | ${cliPath}`, {
    env: mockedDockerEnv(),
    encoding: 'utf8'
  }, (err, stdout, stderr) => {
    t.notOk(err)
    t.equal(stdout, expectedOneTwo)
    t.end()
  })
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

test('cli handles invalid json file', (t) => {
  let err
  try {
    cli(path.resolve(__dirname, 'fixtures', 'inspect-invalid.json'))
  } catch (e) {
    err = e
  }
  t.ok(err)
  t.ok(/Unexpected token d/.test(err.stderr))
  t.equal(err.status, 1)
  t.end()
})

test('cli handles docker inspect empty array', (t) => {
  const output = cli('empty')
  t.equal(output, '\nNothing to translate\n\n')
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
