# ![rekcod](logo.png)

> docker inspect → docker run

[![Build Status](https://travis-ci.org/nexdrew/rekcod.svg?branch=master)](https://travis-ci.org/nexdrew/rekcod)
[![Coverage Status](https://coveralls.io/repos/github/nexdrew/rekcod/badge.svg?branch=master)](https://coveralls.io/github/nexdrew/rekcod?branch=master)
[![Standard Version](https://img.shields.io/badge/release-standard%20version-brightgreen.svg)](https://github.com/conventional-changelog/standard-version)

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

```
$ npm i -g rekcod
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

```sh
# file names as arguments
$ docker inspect container-one > one.json
$ docker inspect 6653931e39f2 happy_torvalds > two.json
$ rekcod one.json two.json

docker run --name container-one ...

docker run --name stinky_jones ...

docker run --name happy_torvalds ...
```

```sh
# pipe in file names
$ docker inspect container-one > one.json
$ docker inspect 6653931e39f2 happy_torvalds > two.json
$ ls *.json | rekcod
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
| `HostConfig.Binds`           | `-v`             |
| `HostConfig.VolumesFrom`     | `--volumes-from` |
| `HostConfig.PortBindings`    | `-p`             |
| `HostConfig.Links`           | `--link`         |
| `HostConfig.PublishAllPorts` | `-P`             |
| `HostConfig.NetworkMode`     | `--net`          |
| `HostConfig.RestartPolicy`   | `--restart`      |
| `HostConfig.ExtraHosts`      | `--add-host`     |
| `Config.Hostname`            | `-h`             |
| `Config.ExposedPorts`        | `--expose`       |
| `Config.Env`                 | `-e`             |
| `Config.Attach`* !== true    | `-d`             |
| `Config.AttachStdin`         | `-a stdin`       |
| `Config.AttachStdout`        | `-a stdout`      |
| `Config.AttachStderr`        | `-a stderr`      |
| `Config.Tty`                 | `-t`             |
| `Config.OpenStdin`           | `-i`             |
| `Config.Entrypoint`          | `--entrypoint`   |
| `Config.Image || Image`      | image name or id |
| `Config.Cmd`                 | command and args |

Prior to version 0.2.0, `rekcod` always assumed `-d` for detached mode, but it now uses that only when all stdio options are not attached. I believe this is the correct behavior, but let me know if it causes you problems. A side effect of this is that the `-d` shows up much later in the `docker run` command than it used to, but it will still be there. ❤

## License

ISC © Contributors
