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

import type { Plugin, IntlString, Resource } from '../platform'
import { plugin } from '../platform'
import { addLocation, getResource } from '../resource'

describe('resource', () => {
  const test = 'test' as Plugin

  const testPlugin = plugin(test, {
    string: {
      Hello: '' as IntlString<{ name: string }>
    },
    test: {
      X: '' as Resource<string>
    }
  })

  addLocation(test, async () => await import('./plugin'))

  it('should load resource', async () => {
    const string = await getResource(testPlugin.test.X)
    expect(string).toBe('Test')
    const cached = await getResource(testPlugin.test.X)
    expect(cached).toBe('Test')
  })
})
