//
// Copyright © 2026 Hardcore Engineering Inc.
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

import { readFileSync } from 'fs'

/**
 * TLS options passed to the Elasticsearch/OpenSearch client.
 * @public
 */
export interface ElasticTlsOptions {
  ca?: string
  rejectUnauthorized?: boolean
}

/**
 * Build TLS options for the Elasticsearch/OpenSearch client from environment variables.
 *
 * - ELASTIC_TLS_CA_FILE - path to a PEM encoded CA certificate (bundle) used to verify the server certificate.
 * - ELASTIC_TLS_VERIFY - set to `false` to skip server certificate verification (insecure).
 *
 * Returns undefined when nothing is configured, so the default client behaviour is unchanged.
 * @public
 */
export function getElasticTlsOptions (
  env: Record<string, string | undefined> = process.env,
  readFile: (path: string) => string = (path) => readFileSync(path, 'utf8'),
  warn: (message: string) => void = (message) => {
    console.warn(message)
  }
): ElasticTlsOptions | undefined {
  const result: ElasticTlsOptions = {}

  const caFile = env.ELASTIC_TLS_CA_FILE?.trim() ?? ''
  if (caFile !== '') {
    result.ca = readFile(caFile)
  }

  const verify = env.ELASTIC_TLS_VERIFY?.trim().toLowerCase() ?? ''
  if (verify === 'false' || verify === '0') {
    result.rejectUnauthorized = false
    warn('ELASTIC_TLS_VERIFY=false: TLS certificate verification for Elasticsearch/OpenSearch is disabled')
  }

  return Object.keys(result).length > 0 ? result : undefined
}
