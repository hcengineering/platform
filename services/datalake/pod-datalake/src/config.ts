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

export interface BucketConfig {
  bucket: string
  location: string
  endpoint: string
  accessKey: string
  secretKey: string
  region?: string
}

export interface Config {
  Port: number
  Secret: string
  AccountsUrl: string
  DbUrl: string
  Buckets: BucketConfig[]
}

const parseNumber = (str: string | undefined): number | undefined => (str !== undefined ? Number(str) : undefined)

function parseBucketsConfig (str: string | undefined): BucketConfig[] {
  if (str === undefined) {
    return []
  }

  const buckets = str.split(';')
  return buckets.map(parseBucketConfig)
}

function parseBucketConfig (str: string): BucketConfig {
  if (str === undefined) {
    throw new Error('Invalid bucket config')
  }

  const [name, url] = str.split('|')
  if (name === undefined || url === undefined) {
    throw new Error('Invalid bucket config')
  }

  const [bucket, location] = name.split(',')
  if (bucket === undefined || location === undefined) {
    throw new Error('Invalid bucket config')
  }

  const uri = new URL(url)
  const endpoint = uri.protocol + '//' + uri.host + uri.pathname

  return {
    bucket,
    location,
    endpoint,
    accessKey: uri.searchParams.get('accessKey') ?? '',
    secretKey: uri.searchParams.get('secretKey') ?? '',
    region: uri.searchParams.get('region') ?? 'auto'
  }
}

const config: Config = (() => {
  const params: Partial<Config> = {
    Port: parseNumber(process.env.PORT) ?? 4030,
    Secret: process.env.SECRET,
    AccountsUrl: process.env.ACCOUNTS_URL,
    DbUrl: process.env.DB_URL,
    Buckets: parseBucketsConfig(process.env.BUCKETS)
  }

  const missingEnv = (Object.keys(params) as Array<keyof Config>).filter((key) => params[key] === undefined)

  if (missingEnv.length > 0) {
    throw Error(`Missing config for attributes: ${missingEnv.join(', ')}`)
  }

  return params as Config
})()

export default config
