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

import { getElasticTlsOptions } from '../tls'

describe('getElasticTlsOptions', () => {
  const readFile = jest.fn((path: string) => `pem:${path}`)
  const warn = jest.fn()

  beforeEach(() => {
    readFile.mockClear()
    warn.mockClear()
  })

  it('returns undefined when nothing is configured', () => {
    expect(getElasticTlsOptions({}, readFile, warn)).toBeUndefined()
    expect(getElasticTlsOptions({ ELASTIC_TLS_CA_FILE: ' ', ELASTIC_TLS_VERIFY: '' }, readFile, warn)).toBeUndefined()
    expect(readFile).not.toHaveBeenCalled()
    expect(warn).not.toHaveBeenCalled()
  })

  it('keeps verification enabled for true or unknown values', () => {
    expect(getElasticTlsOptions({ ELASTIC_TLS_VERIFY: 'true' }, readFile, warn)).toBeUndefined()
    expect(getElasticTlsOptions({ ELASTIC_TLS_VERIFY: 'yes' }, readFile, warn)).toBeUndefined()
    expect(warn).not.toHaveBeenCalled()
  })

  it('reads the CA certificate file', () => {
    expect(getElasticTlsOptions({ ELASTIC_TLS_CA_FILE: '/certs/ca.pem' }, readFile, warn)).toEqual({
      ca: 'pem:/certs/ca.pem'
    })
    expect(readFile).toHaveBeenCalledWith('/certs/ca.pem')
    expect(warn).not.toHaveBeenCalled()
  })

  it('disables certificate verification on explicit opt-in and warns', () => {
    expect(getElasticTlsOptions({ ELASTIC_TLS_VERIFY: 'FALSE' }, readFile, warn)).toEqual({ rejectUnauthorized: false })
    expect(getElasticTlsOptions({ ELASTIC_TLS_VERIFY: '0' }, readFile, warn)).toEqual({ rejectUnauthorized: false })
    expect(warn).toHaveBeenCalledTimes(2)
  })

  it('combines CA file and disabled verification', () => {
    expect(
      getElasticTlsOptions({ ELASTIC_TLS_CA_FILE: '/certs/ca.pem', ELASTIC_TLS_VERIFY: 'false' }, readFile, warn)
    ).toEqual({ ca: 'pem:/certs/ca.pem', rejectUnauthorized: false })
  })

  it('fails when the CA file cannot be read', () => {
    const failing = (): string => {
      throw new Error('ENOENT')
    }
    expect(() => getElasticTlsOptions({ ELASTIC_TLS_CA_FILE: '/missing.pem' }, failing, warn)).toThrow('ENOENT')
  })
})
