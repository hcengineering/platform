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

export MINIO_ENDPOINT=$(kubectl get secret minio -o jsonpath="{.data.endpoint}" | base64 --decode)
export MINIO_ACCESS_KEY=$(kubectl get secret minio -o jsonpath="{.data.accessKey}" | base64 --decode)
export MINIO_SECRET_KEY=$(kubectl get secret minio -o jsonpath="{.data.secretKey}" | base64 --decode)

kubectl run anticrm-tool --rm --tty -i --restart='Never' \
  --env="TRANSACTOR_URL=ws://transactor/" \
  --env="MINIO_ENDPOINT=$MINIO_ENDPOINT" \
  --env="MINIO_ACCESS_KEY=$MINIO_ACCESS_KEY" \
  --env="MINIO_SECRET_KEY=$MINIO_SECRET_KEY" --image anticrm/tool --command -- bash
