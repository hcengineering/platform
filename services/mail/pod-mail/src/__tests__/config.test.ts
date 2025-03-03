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

import { Transport } from '../types'

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
    delete process.env.PORT
    expect(() => require('../config')).toThrow('Missing env variable: Port')
  })

  test('should load default SMTP config if all required env variables are set', () => {
    process.env.PORT = '1025'
    process.env.SMTP_HOST = 'smtp.example.com'
    process.env.SMTP_PORT = '587'
    process.env.SMTP_USERNAME = 'user'

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const loadedConfig = require('../config').default

    expect(loadedConfig.port).toBe(1025)
    expect(loadedConfig.defaultTransport).toBe(Transport.SMTP)
    expect(loadedConfig.smtpConfig).toEqual({
      Host: 'smtp.example.com',
      Port: 587,
      Username: 'user',
      Password: undefined
    })
  })

  test('should load SES config if all required env variables are set', () => {
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
    delete process.env.SES_ACCESS_KEY
    delete process.env.SMTP_HOST

    expect(() => require('../config')).toThrow(
      'Missing env variables for email transfer, please specify SES or SMTP configuration'
    )
  })
})
