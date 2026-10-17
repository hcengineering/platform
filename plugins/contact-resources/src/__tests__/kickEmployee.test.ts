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

import type { Person } from '@hcengineering/contact'
import type { AccountUuid, Ref } from '@hcengineering/core'
import { canKick, isCurrentUser } from '../kickEmployee'

const me = 'account-me' as AccountUuid
const myPerson = 'person-me' as Ref<Person>

const self = { _id: myPerson, personUuid: me }
const other = { _id: 'person-other' as Ref<Person>, personUuid: 'account-other' as AccountUuid }

describe('isCurrentUser', () => {
  it('detects the current user by account uuid', () => {
    expect(isCurrentUser({ _id: 'x' as Ref<Person>, personUuid: me }, me, myPerson)).toBe(true)
  })

  it('detects the current user by employee ref', () => {
    expect(isCurrentUser({ _id: myPerson }, me, myPerson)).toBe(true)
  })

  it('returns false for another person', () => {
    expect(isCurrentUser(other, me, myPerson)).toBe(false)
  })

  it('returns false when the current user is unknown', () => {
    expect(isCurrentUser({ _id: myPerson }, undefined, undefined)).toBe(false)
  })
})

describe('canKick', () => {
  it('allows kicking another employee', () => {
    expect(canKick(other, me, myPerson)).toBe(true)
  })

  it('does not allow kicking yourself', () => {
    expect(canKick(self, me, myPerson)).toBe(false)
  })

  it('does not allow a selection that contains yourself', () => {
    expect(canKick([other, self], me, myPerson)).toBe(false)
  })

  it('returns false for an empty or missing selection', () => {
    expect(canKick([], me, myPerson)).toBe(false)
    expect(canKick(undefined, me, myPerson)).toBe(false)
  })
})
