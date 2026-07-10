//
// Copyright © 2025 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
//
import { config as dotenv } from 'dotenv'

dotenv()

export interface CacheConfig {
  enabled: boolean
  cachePath: string | undefined // if set, enables disk cache
  cacheSize: number | undefined // maximum size of the cache in megabytes
  gcInterval: number | undefined // interval in seconds to run garbage collection
}

export interface Config {
  Port: number
  Secret: string
  ServiceID: string
  Cache: CacheConfig
}

const config: Config = (() => {
  const params: Partial<Config> = {
    Port: parseInt(process.env.PORT ?? '4040'),
    Secret: process.env.SECRET,
    ServiceID: process.env.SERVICE_ID ?? 'preview',
    Cache: {
      enabled: process.env.CACHE_ENABLED !== 'false',
      cachePath: process.env.CACHE_PATH,
      cacheSize: parseInt(process.env.CACHE_SIZE ?? '1024') * 1024 * 1024,
      gcInterval: parseInt(process.env.CACHE_GC_INTERVAL ?? '300') * 1000
    }
  }

  const missingEnv = (Object.keys(params) as Array<keyof Config>).filter((key) => params[key] === undefined)

  if (missingEnv.length > 0) {
    throw Error(`Missing config for attributes: ${missingEnv.join(', ')}`)
  }

  return params as Config
})()

export default config
