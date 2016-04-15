# rekcod

> docker inspect → docker run

A simple module to reverse engineer a `docker run` command from an existing container (via `docker inspect`). Just pass in the container names or ids that you want to reverse engineer and `rekcod` will output a `docker run` command that duplicates the container.

This is not super robust, but it should hopefully cover most arguments needed.

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

docker run -d --name container-name ...
```

```sh
# multiple containers
$ rekcod another-name 6653931e39f2 happy_torvalds

docker run -d --name another-name ...

docker run -d --name stinky_jones ...

docker run -d --name happy_torvalds ...
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
| `Config.Hostname`            | `-h`             |
| `Config.ExposedPorts`        | `--expose`       |
| `Config.Env`                 | `-e`             |
| `Config.Attach`* === false   | `-d`             |
| `Config.AttachStdin`         | `-a stdin`       |
| `Config.AttachStdout`        | `-a stdout`      |
| `Config.AttachStderr`        | `-a stderr`      |
| `Config.Tty`                 | `-t`             |
| `Config.OpenStdin`           | `-i`             |
| `Config.Entrypoint`          | `--entrypoint`   |
| `Config.Image || Image`      | image name or id |
| `Config.Cmd`                 | command and args |

## License

ISC © Contributors
