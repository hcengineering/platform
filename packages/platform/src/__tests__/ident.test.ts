//
// Copyright © 2020 Anticrm Platform Contributors.
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

import type { StatusCode, Plugin, Id } from '../platform'
import { plugin, mergeIds } from '../platform'
import { _parseId } from '../ident'

describe('ident', () => {
  const test = 'test' as Plugin

  it('should identify resources', () => {
    const ids = plugin(test, {
      status: {
        MyString: '' as StatusCode<{}>
      }
    })
    expect(ids.status.MyString).toBe('test:status:MyString')
  })

  it('should merge ids', () => {
    const ids = plugin(test, {
      resource: {
        MyString: '' as StatusCode<{}>
      }
    })
    const merged = mergeIds(test, ids, {
      resource: {
        OneMore: '' as StatusCode<{}>
      },
      more: {
        X: '' as StatusCode<{}>
      }
    })
    expect(merged.resource.MyString).toBe('test:resource:MyString')
    expect(merged.resource.OneMore).toBe('test:resource:OneMore')
    expect(merged.more.X).toBe('test:more:X')
  })

  it('should fail overwriting ids', () => {
    const ids = plugin(test, {
      resource: {
        MyString: '' as StatusCode<{}>
      }
    })
    const f = (): any =>
      mergeIds(test, ids, {
        resource: {
          MyString: 'xxx' as StatusCode<{}>
        }
      })
    expect(f).toThrowError("'identify' overwrites")
  })

  it('should fail to parse id', () => {
    expect(() => _parseId('bad id' as Id)).toThrowError('ERROR: platform:status:InvalidId')
  })

  it('should parse id', () => {
    expect(_parseId('comp:res:X' as Id)).toEqual({
      kind: 'res',
      component: 'comp',
      name: 'X'
    })
  })
})
