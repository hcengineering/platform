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

import type { AnyAttribute, Class, Doc, Domain, Ref } from '@hcengineering/core'
import { isAttributeUsed } from '../attributeUsage'

function makeClient (domain: Domain | undefined, found: Doc | undefined): any {
  return {
    getHierarchy: () => ({ findDomain: jest.fn(() => domain) }),
    findOne: jest.fn(async () => found)
  }
}

const attribute: Pick<AnyAttribute, 'attributeOf' | 'name'> = {
  attributeOf: 'test:mixin:Custom' as Ref<Class<Doc>>,
  name: 'custom1'
}

describe('isAttributeUsed', () => {
  it('queries the attribute class when it has a domain', async () => {
    const client = makeClient('task' as Domain, { _id: 'doc1' } as unknown as Doc)
    expect(await isAttributeUsed(client, attribute)).toBe(true)
    expect(client.findOne).toHaveBeenCalledWith(attribute.attributeOf, { custom1: { $exists: true } })
  })

  it('returns false when no document has the attribute', async () => {
    const client = makeClient('task' as Domain, undefined)
    expect(await isAttributeUsed(client, attribute)).toBe(false)
  })

  it('does not query a domainless class and treats the attribute as used', async () => {
    const client = makeClient(undefined, undefined)
    expect(await isAttributeUsed(client, attribute)).toBe(true)
    expect(client.findOne).not.toHaveBeenCalled()
  })
})
