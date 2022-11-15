#!/bin/bash
#  Copyright © 2020, 2021 Anticrm Platform Contributors.
#  Copyright © 2021 Hardcore Engineering Inc.
#  
#  Licensed under the Eclipse Public License, Version 2.0 (the "License");
#  you may not use this file except in compliance with the License. You may
#  obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
#  
#  Unless required by applicable law or agreed to in writing, software
#  distributed under the License is distributed on an "AS IS" BASIS,
#  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
#  
#  See the License for the specific language governing permissions and
#  limitations under the License.
#

export MONGO_URL=$(kubectl get configmaps anticrm-config -o jsonpath="{.data.mongoDbUrl}")

export ELASTIC_URL=$(kubectl get configmaps anticrm-config -o jsonpath="{.data.elasticUrl}")

export MINIO_ENDPOINT=$(kubectl get configmaps anticrm-config -o jsonpath="{.data.minioEndpointUrl}")
export MINIO_ACCESS_KEY=$(kubectl get secret anticrm-secret -o jsonpath="{.data.minioAccessKey}" | base64 --decode)
export MINIO_SECRET_KEY=$(kubectl get secret anticrm-secret -o jsonpath="{.data.minioSecretKey}" | base64 --decode)

export SERVER_SECRET=$(kubectl get secret anticrm-secret -o jsonpath="{.data.serverSecret}" | base64 --decode)

kubectl run anticrm-tool --rm --tty -i --restart='Never' \
  --env="MONGO_URL=$MONGO_URL" \
  --env="TRANSACTOR_URL=ws://transactor/" \
  --env="ELASTIC_URL=$ELASTIC_URL" \
  --env="TELEGRAM_DATABASE=telegram-service" \
  --env="MINIO_ENDPOINT=$MINIO_ENDPOINT" \
  --env="MINIO_ACCESS_KEY=$MINIO_ACCESS_KEY" \
  --env="MINIO_SECRET_KEY=$MINIO_SECRET_KEY" \
  --env="SERVER_SECRET=$SERVER_SECRET" \
  --image hardcoreeng/tool:v0.6.40 --command -- bash
