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
  '--runtime runc ' +
  '-v /var/lib/replicated:/var/lib/replicated -v /proc:/host/proc:ro ' +
  '-p 4700:4700/tcp -p 4702:4702/tcp ' +
  '--link project_postgres_1:postgres --link project_rrservice_1:project_rrservice_1 ' +
  '-P ' +
  '--net host ' +
  '--uts host ' +
  '--restart on-failure:5 ' +
  '--add-host xyz:1.2.3.4 --add-host abc:5.6.7.8 ' +
  '--pid container:9ca8ac5c5b829c5c0a65a290b7c4eb74e9ba36f69344ee11392841fd41d5e3de ' +
  '--security-opt \'label=level:s0:c100,c200\' ' +
  '--security-opt \'label=user:USER\' ' +
  '--security-opt \'label=role:ROLE\' ' +
  '--security-opt \'label=type:TYPE\' ' +
  '--security-opt \'label=level:LEVEL\' ' +
  '--security-opt \'label=disable\' ' +
  '--security-opt \'apparmor=docker-default\' ' +
  '--security-opt \'no-new-privileges:true\' ' +
  '--security-opt \'seccomp=unconfined\' ' +
  '--security-opt \'label=type:svirt_apache_t\' ' +
  '--expose 4700/tcp --expose 4702/tcp ' +
  '-l com.docker.compose.config-hash=\'9f94e0df059d6b68fa0e306b9ee555b4fb9d6dbdb3982a0b0f6c7adca2945f26\' ' +
  '-l com.docker.compose.container-number=\'1\' ' +
  '-l com.docker.compose.oneoff=\'False\' ' +
  '-l com.docker.compose.project=\'project\' ' +
  '-l com.docker.compose.service=\'service\' ' +
  '-l com.docker.compose.version=\'1.8.0\' ' +
  '-e \'DB_USER=postgres\' ' +
  '-e \'no_proxy=*.local, 169.254/16\' ' +
  '-e \'special_char_env_var1=abc(!)123\' ' +
  '-e \'special_char_env_var2=abc(\'\\\'\')123\' ' +
  '-e \'special_char_env_var3=abc()123\' ' +
  '-d ' +
  '--entrypoint "tini -- /docker-entrypoint.sh" ' +
  'project_service \'/etc/npme/start.sh\' \'-g\'' +
  '\n\n' +
  'docker run ' +
  '--name hello ' +
  '--privileged ' +
  '--runtime nvidia ' +
  '--volumes-from admiring_brown --volumes-from silly_jang ' +
  '--restart no ' +
  '--group-add audio --group-add nogroup --group-add 777 ' +
  '-h 46d567b2ef86 ' +
  '--domainname rekcod.xyz ' +
  '-e \'PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin\' ' +
  '-a stdout -a stderr ' +
  '-t -i ' +
  'hello-world \'sh\' \'-c\' \'(a -a) && (b -b)\'' +
  '\n\n'

test('cli works for docker inspect happy path', t => {
  const dockerRunCommands = cli('one two')
  t.strictEqual(dockerRunCommands, expectedOneTwo)
  t.end()
})

test('cli accepts file name arg', t => {
  const dockerRunCommands = cli(oneTwoFixture)
  t.strictEqual(dockerRunCommands, expectedOneTwo)
  t.end()
})

test('pipe json to cli', t => {
  childProcess.exec(`cat ${oneTwoFixture} | ${cliPath}`, (err, stdout, stderr) => {
    t.notOk(err)
    t.strictEqual(stdout, expectedOneTwo)
    t.end()
  })
})

test('pipe file name to cli', t => {
  childProcess.exec(`ls ${oneTwoFixture} | ${cliPath}`, (err, stdout, stderr) => {
    t.notOk(err)
    t.strictEqual(stdout, expectedOneTwo)
    t.end()
  })
})

test('pipe container ids to cli', t => {
  childProcess.exec(`echo 'one two' | ${cliPath}`, {
    env: mockedDockerEnv(),
    encoding: 'utf8'
  }, (err, stdout, stderr) => {
    t.notOk(err)
    t.strictEqual(stdout, expectedOneTwo)
    t.end()
  })
})

test('cli handles docker inspect invalid json', t => {
  let err
  try {
    cli('invalid')
  } catch (e) {
    err = e
  }
  t.ok(err)
  t.ok(/Unexpected token d/.test(err.stderr))
  t.strictEqual(err.status, 1)
  t.end()
})

test('cli handles invalid json file', t => {
  let err
  try {
    cli(path.resolve(__dirname, 'fixtures', 'inspect-invalid.json'))
  } catch (e) {
    err = e
  }
  t.ok(err)
  t.ok(/Unexpected token d/.test(err.stderr))
  t.strictEqual(err.status, 1)
  t.end()
})

test('cli handles docker inspect empty array', t => {
  const output = cli('empty')
  t.strictEqual(output, '\nNothing to translate\n\n')
  t.end()
})

test('cli handles docker inspect error', t => {
  let err
  try {
    cli('error')
  } catch (e) {
    err = e
  }
  t.ok(err)
  t.strictEqual(err.stdout, 'Preparing to error out\n\n')
  t.strictEqual(err.stderr, 'An error has occurred\n\n')
  t.strictEqual(err.status, 127)
  t.end()
})

test('cli handles no docker', t => {
  let err
  try {
    cli('dne', '/dne')
  } catch (e) {
    err = e
  }
  t.ok(err)
  t.ok(/spawn docker ENOENT/.test(err.stderr))
  t.strictEqual(err.status, 1)
  t.end()
})
