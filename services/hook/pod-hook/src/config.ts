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
import { config as dotenvConfig } from 'dotenv'

dotenvConfig()

export interface Config {
  port: number
  ingoredEmails: string[]
  messageServiceUrl: string
}

const envMap = {
  Port: 'PORT',
  IngoredEmails: 'IGNORED_EMAILS',
  MessageServiceUrl: 'MESSAGE_SERVICE_URL'
}

const parseNumber = (str: string | undefined): number | undefined => (str !== undefined ? Number(str) : undefined)
const parseEmailsList = (str: string | undefined): string[] => (str !== undefined ? str.split(',') : [])

const config: Config = (() => {
  const port = parseNumber(process.env[envMap.Port])
  if (port === undefined) {
    throw Error('Missing env variable: Port')
  }
  const messageServiceUrl = process.env[envMap.MessageServiceUrl]
  if (messageServiceUrl === undefined) {
    throw Error('Missing env variable: MessageServiceUrl')
  }
  const ingoredEmails = parseEmailsList(process.env[envMap.IngoredEmails])
  const params: Config = {
    port,
    ingoredEmails,
    messageServiceUrl
  }

  return params
})()

export default config
