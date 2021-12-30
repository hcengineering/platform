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
