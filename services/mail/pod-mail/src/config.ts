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
import { Transport } from './types'

export interface Config {
  port: number
  defaultTransport: Transport
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

const buildSesConfig = (): SesConfig | undefined => {
  const accessKey = process.env[envMap.SesAccessKey]
  const secretKey = process.env[envMap.SesSecretKey]
  const region = process.env[envMap.SesRegion]

  if (isEmpty(accessKey) || isEmpty(secretKey) || isEmpty(region)) {
    const missingKeys = [
      isEmpty(accessKey) && 'SES_ACCESS_KEY',
      isEmpty(secretKey) && 'SES_SECRET_KEY',
      isEmpty(region) && 'SES_REGION'
    ].filter(Boolean)
    if (missingKeys.length === 3) {
      console.log('SES is not enabled')
    } else {
      throw Error(`Missing env variables for SES configuration: ${missingKeys.join(', ')}`)
    }
    return undefined
  }

  return {
    AccessKey: accessKey as string,
    SecretKey: secretKey as string,
    Region: region as string
  }
}

const buildSmtpConfig = (): SmtpConfig | undefined => {
  const host = process.env[envMap.SmtpHost]
  const port = parseNumber(process.env[envMap.SmtpPort])
  const username = process.env[envMap.SmtpUsername]
  const password = process.env[envMap.SmtpPassword]

  if (isEmpty(host) || port === undefined) {
    const missingKeys = [isEmpty(host) && 'SMTP_HOST', port === undefined && 'SMTP_PORT'].filter(Boolean)

    if (missingKeys.length === 2) {
      console.log('SMTP is not enabled')
    } else {
      throw Error(`Missing env variables for SMTP configuration: ${missingKeys.join(', ')}`)
    }
    return undefined
  }

  return {
    Host: host as string,
    Port: port,
    Username: username,
    Password: password
  }
}

const config: Config = (() => {
  const params: Config = {
    port: parseNumber(process.env[envMap.Port]) ?? 8097,
    defaultTransport: process.env[envMap.DefaultProtocol] === Transport.SES ? Transport.SES : Transport.SMTP,
    sesConfig: buildSesConfig(),
    smtpConfig: buildSmtpConfig()
  }

  if (params.port === undefined) {
    throw Error('Missing env variable: Port')
  }
  if (params.sesConfig === undefined && params.smtpConfig === undefined) {
    throw Error('Missing env variables for email transfer, please specify SES or SMTP configuration')
  }

  return params
})()

export default config
