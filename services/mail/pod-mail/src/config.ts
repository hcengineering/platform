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

export enum TlsOptions {
  SECURE = 'secure', // Always use TLS (implicit TLS)
  UPGRADE = 'upgrade', // Start unencrypted, upgrade to TLS if supported (STARTTLS)
  IGNORE = 'ignore' // Do not use TLS (not recommended for production use)
}

export interface SmtpConfig {
  Host: string
  Port: number
  Username: string | undefined
  Password: string | undefined
  TlsMode: TlsOptions
  DebugLog?: boolean
  AllowSelfSigned?: boolean
}

export interface TlsSettings {
  secure: boolean
  ignoreTLS: boolean
  tls?: {
    rejectUnauthorized: boolean
  }
}

export function getTlsSettings (config: SmtpConfig): TlsSettings {
  const tlsConfig: TlsSettings = {
    secure: config.TlsMode === TlsOptions.SECURE,
    ignoreTLS: config.TlsMode === TlsOptions.IGNORE
  }
  if (config.AllowSelfSigned === true) {
    tlsConfig.tls = {
      rejectUnauthorized: false
    }
  }
  return tlsConfig
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
  SmtpPassword: 'SMTP_PASSWORD',
  SmtpTlsMode: 'SMTP_TLS_MODE', // TLS mode, see TlsOptions for possible values
  SmtpDebugLog: 'SMTP_DEBUG_LOG', // Enable debug logging for SMTP
  SmtpAllowSelfSigned: 'SMTP_ALLOW_SELF_SIGNED' // Allow self-signed certificates (not recommended for production use)
}

const parseNumber = (str: string | undefined): number | undefined => (str !== undefined ? Number(str) : undefined)
const isEmpty = (str: string | undefined): boolean => str === undefined || str.trim().length === 0

const normalizeTlsMode = (mode: string | undefined): TlsOptions | undefined => {
  if (mode === undefined || mode === '') return undefined
  const normalized = mode.toLowerCase()
  const value: TlsOptions | undefined = Object.values(TlsOptions).find((opt) => opt.toLowerCase() === normalized)
  if (value === undefined) {
    throw Error('Invalid SMTP_TLS_MODE value. Must be one of: secure, upgrade, ignore')
  }
  return value
}

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
  const tlsMode = normalizeTlsMode(process.env[envMap.SmtpTlsMode])
  const debugLog = process.env[envMap.SmtpDebugLog]?.toLowerCase() === 'true'
  const allowSelfSigned = process.env[envMap.SmtpAllowSelfSigned]?.toLowerCase() === 'true'

  if (isEmpty(host) || port === undefined) {
    const missingKeys = [isEmpty(host) && 'SMTP_HOST', port === undefined && 'SMTP_PORT'].filter(Boolean)
    throw Error(`Missing env variables for SMTP configuration: ${missingKeys.join(', ')}`)
  }

  return {
    Host: host as string,
    Port: port,
    Username: username,
    Password: password,
    TlsMode: tlsMode ?? TlsOptions.UPGRADE,
    DebugLog: debugLog,
    AllowSelfSigned: allowSelfSigned
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
