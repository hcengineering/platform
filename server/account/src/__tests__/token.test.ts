//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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

import type { PersonUuid, WorkspaceUuid } from '@hcengineering/core'
import { generateToken } from '@hcengineering/server-token'

export function decodeTokenPayload (token: string): any {
  try {
    return JSON.parse(atob(token.split('.')[1]))
  } catch (err: any) {
    console.error(err)
    return {}
  }
}
describe('generate-tokens', () => {
  it('should generate tokens', async () => {
    const extra: Record<string, any> = { confirmed: 'true' }
    const token = generateToken('mike@some.host' as PersonUuid, '' as WorkspaceUuid, extra, 'secret')
    console.log(token)
    const decodedPayload = decodeTokenPayload(token)
    expect(decodedPayload).toEqual({
      extra: {
        confirmed: 'true'
      },
      account: 'mike@some.host',
      workspace: ''
    })
    expect(decodedPayload.admin).not.toBe('true')
  })
})
