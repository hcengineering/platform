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

import { AccountRole } from '@hcengineering/core'
import { ASSIGNABLE_ROLES, parseRole } from '../components/admin-users/roles'

describe('parseRole', () => {
  it('lists exactly the four assignable workspace roles', () => {
    expect([...ASSIGNABLE_ROLES]).toEqual([
      AccountRole.Guest,
      AccountRole.User,
      AccountRole.Maintainer,
      AccountRole.Owner
    ])
  })

  it.each([AccountRole.Guest, AccountRole.User, AccountRole.Maintainer, AccountRole.Owner])(
    'returns %s unchanged',
    (role) => {
      expect(parseRole(role)).toBe(role)
      expect(Number.isNaN(parseRole(role) as unknown as number)).toBe(false)
    }
  )

  const nonAssignable = Object.values(AccountRole).filter((r) => !ASSIGNABLE_ROLES.includes(r))

  it('treats Admin, DocGuest and ReadOnlyGuest as non-assignable', () => {
    expect([...nonAssignable].sort()).toEqual(
      [AccountRole.Admin, AccountRole.DocGuest, AccountRole.ReadOnlyGuest].sort()
    )
  })

  it.each(nonAssignable)('throws for non-assignable enum role %s', (role) => {
    expect(() => parseRole(role)).toThrow(/not an assignable workspace role/)
  })

  it.each([['4'], [4], ['NaN'], [undefined], [null], [''], ['user'], ['DOCGUEST'], [{}]])('throws for %p', (value) => {
    expect(() => parseRole(value)).toThrow(/not an assignable workspace role/)
  })
})
