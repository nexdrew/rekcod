# ![rekcod](https://raw.githubusercontent.com/nexdrew/rekcod/master/logo.png)

> docker inspect → docker run

[![Build Status](https://travis-ci.com/nexdrew/rekcod.svg?branch=master)](https://travis-ci.com/nexdrew/rekcod)
[![Coverage Status](https://coveralls.io/repos/github/nexdrew/rekcod/badge.svg?branch=master)](https://coveralls.io/github/nexdrew/rekcod?branch=master)
[![JavaScript Style Guide](https://badgen.net/badge/code%20style/standard/green)](https://standardjs.com)
[![Standard Version](https://img.shields.io/badge/release-standard%20version-brightgreen.svg)](https://github.com/conventional-changelog/standard-version)
![Dependabot Badge](https://badgen.net/dependabot/nexdrew/rekcod?icon=dependabot&label=dependabot)
[![Docker Pulls](https://badgen.net/docker/pulls/nexdrew/rekcod?icon=docker)](https://hub.docker.com/r/nexdrew/rekcod)
[![Docker Image Size](https://badgen.net/docker/size/nexdrew/rekcod?icon=docker)](https://hub.docker.com/r/nexdrew/rekcod)

Reverse engineer a `docker run` command from an existing container (via `docker inspect`).

`rekcod` can turn any of the following into a `docker run` command:

1. container ids/names (`rekcod` will call `docker inspect`)
2. path to file containing `docker inspect` output
3. raw JSON (pass the `docker inspect` output directly)

Each `docker run` command can be used to duplicate the containers.

This is not super robust, but it should cover most arguments needed. See [Fields Supported](#fields-supported) below.

When passing container ids/names, this module calls `docker inspect` directly, and the user running it should be able to as well.

(If you didn't notice, the dumb name for this package is just "docker" in reverse.)

## Install and Usage

### CLI

If you have Node installed:

```
$ npm i -g rekcod
```

If you only have Docker installed:

```
$ docker pull nexdrew/rekcod
$ alias rekcod="docker run --rm -i -v /var/run/docker.sock:/var/run/docker.sock nexdrew/rekcod"
```

Or you can simply run this, no installation required:

```
$ docker run --rm -i -v /var/run/docker.sock:/var/run/docker.sock nexdrew/rekcod <container>
```

#### Containers

```sh
# containers as arguments
$ rekcod container-one 6653931e39f2 happy_torvalds

docker run --name container-one ...

docker run --name stinky_jones ...

docker run --name happy_torvalds ...
```

```sh
# pipe in containers
$ docker ps -aq | rekcod

docker run --name container-one ...

docker run --name stinky_jones ...

docker run --name happy_torvalds ...
```

#### Files

If you are using the Node CLI - i.e. you installed `rekcod` via npm or yarn - you can pass file names or file contents to `rekcod` as is, since the Node CLI will have access to files on the host file system:

```sh
# file names as arguments (Node CLI example)
$ docker inspect container-one > one.json
$ docker inspect 6653931e39f2 happy_torvalds > two.json
$ rekcod one.json two.json

docker run --name container-one ...

docker run --name stinky_jones ...

docker run --name happy_torvalds ...
```

```sh
# pipe in file names (Node CLI example)
$ docker inspect container-one > one.json
$ docker inspect 6653931e39f2 happy_torvalds > two.json
$ ls *.json | rekcod
```

If you are using the Docker-only version of `rekcod` - i.e. you are using `docker run` to run the `nexdrew/rekcod` image - then note that **you'll need to bind mount files** from the host file system as volumes on the `rekcod` container in order for the containerized executable to read them:

```sh
# file names as arguments (Docker-only example)
$ docker inspect container-one > one.json
$ docker run --rm -i -v /var/run/docker.sock:/var/run/docker.sock -v `pwd`/one.json:/one.json nexdrew/rekcod /one.json

docker run --name container-one ...
```

Otherwise, as long as you read the file from the host system, you can pipe the contents of a file to `rekcod` and either installation method will work:

```sh
# pipe in file contents (works for Node CLI or Docker-only alias)
$ cat one.json | rekcod
```

#### JSON

```sh
$ docker inspect container-one 6653931e39f2 | rekcod

docker run --name container-one ...

docker run --name stinky_jones ...
```

### Module

```
$ npm i --save rekcod
```

#### Containers via async `reckod()`

```js
const rekcod = require('rekcod')
// single container
rekcod('container-name', (err, run) => {
  if (err) return console.error(err)
  console.log(run[0].command)
})
// multiple containers
rekcod(['another-name', '6653931e39f2', 'happy_torvalds'], (err, run) => {
  if (err) return console.error(err)
  run.forEach((r) => {
    console.log('\n', r.command)
  })
})
```

#### File via async `rekcod.readFile()`

```js
const rekcod = require('rekcod')
rekcod.readFile('docker-inspect.json', (err, run) => {
  if (err) return console.error(err)
  run.forEach((r) => {
    console.log('\n', r.command)
  })
})
```

#### Parse a JSON string via sync `rekcod.parse()`

```js
const fs = require('fs')
const rekcod = require('rekcod')
let array
try {
  array = rekcod.parse(fs.readFileSync('docker-inspect.json', 'utf8'))
} catch (err) {
  return console.error(err)
}
array.forEach((r) => {
  console.log('\n', r.command)
})
```

## Fields Supported

`rekcod` will translate the following `docker inspect` fields into the listed `docker run` arguments.

| docker inspect               | docker run       |
| ---------------------------- | ---------------- |
| `Name`                       | `--name`         |
| `HostConfig.Privileged`      | `--privileged`   |
| `HostConfig.Runtime`         | `--runtime`      |
| `HostConfig.Binds`           | `-v`             |
| `HostConfig.VolumesFrom`     | `--volumes-from` |
| `HostConfig.PortBindings`    | `-p`             |
| `HostConfig.Links`           | `--link`         |
| `HostConfig.PublishAllPorts` | `-P`             |
| `HostConfig.NetworkMode`     | `--net`          |
| `HostConfig.UTSMode`         | `--uts`          |
| `HostConfig.RestartPolicy`   | `--restart`      |
| `HostConfig.ExtraHosts`      | `--add-host`     |
| `Config.Hostname`            | `-h`             |
| `Config.Domainname`          | `--domainname`   |
| `Config.ExposedPorts`        | `--expose`       |
| `Config.Labels`              | `-l`             |
| `Config.Env`                 | `-e`             |
| `Config.Attach`* !== true    | `-d`             |
| `Config.AttachStdin`         | `-a stdin`       |
| `Config.AttachStdout`        | `-a stdout`      |
| `Config.AttachStderr`        | `-a stderr`      |
| `Config.Tty`                 | `-t`             |
| `Config.OpenStdin`           | `-i`             |
| `Config.Entrypoint`          | `--entrypoint`   |
| `Config.Image` &#124;&#124; `Image` | image name or id |
| `Config.Cmd`                 | command and args |

Prior to version 0.2.0, `rekcod` always assumed `-d` for detached mode, but it now uses that only when all stdio options are not attached. I believe this is the correct behavior, but let me know if it causes you problems. A side effect of this is that the `-d` shows up much later in the `docker run` command than it used to, but it will still be there. ❤

## License

ISC © Contributors
