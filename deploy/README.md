
# Deploying Platform on k8s cluster

We need [MongoDb](https://www.mongodb.com), [Elastic Search](https://www.elastic.co), and [MinIO](https://www.min.io) servers installed on the network/cloud.
You should have credentials to access these servers to continue deployment.

## Secrets

`secret.yaml` provide exemplary configuration values to access data storage servers. Provide correct values and

```
kubectl apply -f secret.yaml
```

## Deploying Transactor service

```
cd server/server
kubectl apply -f kube/transactor.yml
kubectl apply -f kube/ingress.yml
```

## Deploying Front-end services

```
cd server/front
kubectl apply -f kube/front.yml
kubectl apply -f kube/ingress.yml
```

## Deploying Account services

```
cd pods/account
kubectl apply -f kube/deployment.yml
kubectl apply -f kube/service.yml
kubectl apply -f kube/ingress.yml
```

## Deploying Upload services

```
cd server/upload
kubectl apply -f kube/deployment.yml
kubectl apply -f kube/service.yml
kubectl apply -f kube/ingress.yml
```
