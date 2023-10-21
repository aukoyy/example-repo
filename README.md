# example-repo

Basic node-typescript project using express framework

## Project structure

```
├── app
│   └── example
│       ├── package.json
│       ├── src
│       │   ├── api.ts
│       │   └── server.ts
│       ├── test
│       │   └── example
│       │       └── simple.test.ts
│       ├── tsconfig.build.json
│       ├── tsconfig.json
│       └── yarn.lock
├── Makefile
└── README.md
```

## Development

**Install dependencies**

```shell
yarn --cwd app/example/ install
```

**Run postgresl with docker-compose**

```shell
docker-compose up
```

> The database have been configured to load SQL files from
> `app/example/migrations` during start, the database need to be
> restarted if the files are updated

```shell
docker-compose down
docker-compose up --detach
```

**Run development mode**

> The App restarts automatically when update is saved to `*.ts` files.

```shell
yarn --cwd app/example start
```

> The example API will then by default be running on port 3000

```
curl http://localhost:3000/ping -s
"pong"
```
