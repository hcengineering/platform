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
  source?: string
  sesConfig?: SesConfig
  smtpConfig?: SmtpConfig
}

export interface SesConfig {
  AccessKey: string
  SecretKey: string
  Region: string
}

export interface SmtpConfig {
  Host: string
  Port: number
  Username: string | undefined
  Password: string | undefined
}

const envMap = {
  Port: 'PORT',
  Source: 'SOURCE',
  DefaultProtocol: 'DEFAULT_PROTOCOL',
  SesAccessKey: 'SES_ACCESS_KEY',
  SesSecretKey: 'SES_SECRET_KEY',
  SesRegion: 'SES_REGION',
  SmtpHost: 'SMTP_HOST',
  SmtpPort: 'SMTP_PORT',
  SmtpUsername: 'SMTP_USERNAME',
  SmtpPassword: 'SMTP_PASSWORD'
}

const parseNumber = (str: string | undefined): number | undefined => (str !== undefined ? Number(str) : undefined)
const isEmpty = (str: string | undefined): boolean => str === undefined || str.trim().length === 0

const buildSesConfig = (): SesConfig => {
  const accessKey = process.env[envMap.SesAccessKey]
  const secretKey = process.env[envMap.SesSecretKey]
  const region = process.env[envMap.SesRegion]

  if (isEmpty(accessKey) || isEmpty(secretKey) || isEmpty(region)) {
    const missingKeys = [
      isEmpty(accessKey) && 'SES_ACCESS_KEY',
      isEmpty(secretKey) && 'SES_SECRET_KEY',
      isEmpty(region) && 'SES_REGION'
    ].filter(Boolean)
    throw Error(`Missing env variables for SES configuration: ${missingKeys.join(', ')}`)
  }

  return {
    AccessKey: accessKey as string,
    SecretKey: secretKey as string,
    Region: region as string
  }
}

const buildSmtpConfig = (): SmtpConfig => {
  const host = process.env[envMap.SmtpHost]
  const port = parseNumber(process.env[envMap.SmtpPort])
  const username = process.env[envMap.SmtpUsername]
  const password = process.env[envMap.SmtpPassword]

  if (isEmpty(host) || port === undefined) {
    const missingKeys = [isEmpty(host) && 'SMTP_HOST', port === undefined && 'SMTP_PORT'].filter(Boolean)

    throw Error(`Missing env variables for SMTP configuration: ${missingKeys.join(', ')}`)
  }

  return {
    Host: host as string,
    Port: port,
    Username: username,
    Password: password
  }
}

const config: Config = (() => {
  const port = parseNumber(process.env[envMap.Port])
  if (port === undefined) {
    throw Error('Missing env variable: Port')
  }
  const isSmtpConfig = !isEmpty(process.env[envMap.SmtpHost])
  const isSesConfig = !isEmpty(process.env[envMap.SesAccessKey])
  if (isSmtpConfig && isSesConfig) {
    throw Error('Both SMTP and SES configuration are specified, please specify only one')
  }
  if (!isSmtpConfig && !isSesConfig) {
    throw Error('Please specify SES or SMTP configuration')
  }
  const params: Config = {
    port,
    source: process.env[envMap.Source],
    sesConfig: isSesConfig ? buildSesConfig() : undefined,
    smtpConfig: isSmtpConfig ? buildSmtpConfig() : undefined
  }

  return params
})()

export default config
