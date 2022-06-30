# Docker Compose dev image

## Running platform inside docker compose

```bash
rush build
rush bundle
rush docker:build
docker-compose up -d --force-recreate
```

## Running ElasticVUE to check elastic intance

```bash
docker run -p 8082:8080 -d cars10/elasticvue
```

## Running Local NPM registry with Docker

```bash
docker run -it --rm --name verdaccio -p 4873:4873 verdaccio/verdaccio
```

```bash
npm set registry http://localhost:4873
npm adduser
npm login
```

Verdaccio will be available via HTTP http://localhost:4873