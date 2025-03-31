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

describe('Config', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.resetModules()
    process.env = { ...originalEnv }
  })

  afterAll(() => {
    process.env = originalEnv
  })

  test('should throw an error if PORT is missing', () => {
    process.env.PORT = undefined
    expect(() => require('../config')).toThrow('Missing env variable: Port')
  })

  test('should load default SMTP config if all required env variables are set', () => {
    process.env.PORT = '1025'
    process.env.SMTP_HOST = 'smtp.example.com'
    process.env.SMTP_PORT = '587'
    process.env.SMTP_USERNAME = 'user'
    process.env.SMTP_PASSWORD = undefined

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const loadedConfig = require('../config').default

    expect(loadedConfig.port).toBe(1025)
    expect(loadedConfig.smtpConfig).toEqual({
      Host: 'smtp.example.com',
      Port: 587,
      Username: 'user',
      Password: undefined,
      TlsMode: 'upgrade',
      DebugLog: false,
      allowSelfSigned: false
    })
  })

  test('should properly configure TLS settings', () => {
    process.env.PORT = '1025'
    process.env.SMTP_HOST = 'smtp.example.com'
    process.env.SMTP_PORT = '587'
    process.env.SMTP_TLS_MODE = 'secure'

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { default: config, getTlsSettings } = require('../config')
    const tlsSettings = getTlsSettings(config.smtpConfig)

    expect(tlsSettings).toEqual({
      secure: true,
      ignoreTLS: false
    })
  })

  test('should handle debug and self-signed certificate settings', () => {
    process.env.PORT = '1025'
    process.env.SMTP_HOST = 'smtp.example.com'
    process.env.SMTP_PORT = '587'
    process.env.SMTP_DEBUG_LOG = 'true'
    process.env.SMTP_ALLOW_SELF_SIGNED = 'true'

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { default: config, getTlsSettings } = require('../config')

    expect(config.smtpConfig).toMatchObject({
      DebugLog: true,
      allowSelfSigned: true
    })
    const tlsSettings = getTlsSettings(config.smtpConfig)
    expect(tlsSettings).toEqual({
      secure: false,
      ignoreTLS: false,
      tls: {
        rejectUnauthorized: false
      }
    })
  })

  test('should load SES config if all required env variables are set', () => {
    process.env.SMTP_HOST = undefined
    process.env.PORT = '1025'
    process.env.SES_ACCESS_KEY = 'access_key'
    process.env.SES_SECRET_KEY = 'secret_key'
    process.env.SES_REGION = 'us-west-2'

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const loadedConfig = require('../config').default

    expect(loadedConfig.sesConfig).toEqual({
      AccessKey: 'access_key',
      SecretKey: 'secret_key',
      Region: 'us-west-2'
    })
  })

  test('should throw an error if both SES and SMTP configs are missing', () => {
    process.env.PORT = '1025'
    process.env.SES_ACCESS_KEY = undefined
    process.env.SMTP_HOST = undefined

    expect(() => require('../config')).toThrow('Please specify SES or SMTP configuration')
  })

  test('should throw an error if both SES and SMTP are configured', () => {
    process.env.PORT = '1025'
    process.env.SES_ACCESS_KEY = 'access_key'
    process.env.SMTP_HOST = 'smtp.example.com'

    expect(() => require('../config')).toThrow('Both SMTP and SES configuration are specified, please specify only one')
  })
})
