//
// Copyright © 2024 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the 'License');
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an 'AS IS' BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
//

import { type Location } from './types'

export interface Storage {
  location: Location
  bucket: R2Bucket

  bucketName: string
  bucketAccessKey: string
  bucketSecretKey: string
}

export function selectStorage (env: Env, workspace: string): Storage {
  const location = selectLocation(env, workspace)
  switch (location) {
    case 'apac':
      return {
        location,
        bucket: env.DATALAKE_APAC,
        bucketName: env.DATALAKE_APAC_BUCKET_NAME,
        bucketAccessKey: env.DATALAKE_APAC_ACCESS_KEY,
        bucketSecretKey: env.DATALAKE_APAC_SECRET_KEY
      }
    case 'eeur':
      return {
        location,
        bucket: env.DATALAKE_EEUR,
        bucketName: env.DATALAKE_EEUR_BUCKET_NAME,
        bucketAccessKey: env.DATALAKE_EEUR_ACCESS_KEY,
        bucketSecretKey: env.DATALAKE_EEUR_SECRET_KEY
      }
    case 'weur':
      return {
        location,
        bucket: env.DATALAKE_WEUR,
        bucketName: env.DATALAKE_WEUR_BUCKET_NAME,
        bucketAccessKey: env.DATALAKE_WEUR_ACCESS_KEY,
        bucketSecretKey: env.DATALAKE_WEUR_SECRET_KEY
      }
    case 'enam':
      return {
        location,
        bucket: env.DATALAKE_ENAM,
        bucketName: env.DATALAKE_ENAM_BUCKET_NAME,
        bucketAccessKey: env.DATALAKE_ENAM_ACCESS_KEY,
        bucketSecretKey: env.DATALAKE_ENAM_SECRET_KEY
      }
    case 'wnam':
      return {
        location,
        bucket: env.DATALAKE_WNAM,
        bucketName: env.DATALAKE_WNAM_BUCKET_NAME,
        bucketAccessKey: env.DATALAKE_WNAM_ACCESS_KEY,
        bucketSecretKey: env.DATALAKE_WNAM_SECRET_KEY
      }
  }
}

function selectLocation (env: Env, workspace: string): Location {
  // TODO select location based on workspace
  return 'weur'
}
