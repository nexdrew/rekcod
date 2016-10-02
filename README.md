# rekcod

> docker inspect → docker run

[![Build Status](https://travis-ci.org/nexdrew/rekcod.svg?branch=master)](https://travis-ci.org/nexdrew/rekcod)
[![Coverage Status](https://coveralls.io/repos/github/nexdrew/rekcod/badge.svg?branch=master)](https://coveralls.io/github/nexdrew/rekcod?branch=master)
[![Standard Version](https://img.shields.io/badge/release-standard%20version-brightgreen.svg)](https://github.com/conventional-changelog/standard-version)

A simple module to reverse engineer a `docker run` command from an existing container (via `docker inspect`). Just pass in the container names or ids that you want to reverse engineer and `rekcod` will output a `docker run` command that duplicates the container.

This is not super robust, but it should hopefully cover most arguments needed. See [Fields Supported](#fields-supported) below.

This module calls `docker inspect` directly, and the user running it should be able to as well.

(If you didn't notice, the dumb name for this package is just "docker" in reverse.)

## Install and Usage

### CLI

```
$ npm i -g rekcod
```

```sh
# single container
$ rekcod container-name

docker run --name container-name ...
```

```sh
# multiple containers
$ rekcod another-name 6653931e39f2 happy_torvalds

docker run --name another-name ...

docker run --name stinky_jones ...

docker run --name happy_torvalds ...
```

```sh
# all containers!
$ sudo rekcod $(sudo docker ps -aq)
```

### Module

```
$ npm i --save rekcod
```

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
