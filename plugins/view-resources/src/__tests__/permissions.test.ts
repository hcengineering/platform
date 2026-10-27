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
import { type PermissionsStore } from '@hcengineering/contact'
import core, { type Class, type Doc, type Permission, type Ref, type Space } from '@hcengineering/core'

import { canChangeDoc, canCreateObject, canRemoveDoc } from '../permissions'

const OBJECT_CLASS = 'test:class:Object' as Ref<Class<Doc>>
const SPACE = 'test:space:Restricted' as Ref<Space>

// Class-specific permissions without txMatch, as defined by space types (e.g. drive.permission.RemoveFile)
const ALLOW_REMOVE = {
  _id: 'test:permission:AllowRemove' as Ref<Permission>,
  objectClass: OBJECT_CLASS,
  txClass: core.class.TxRemoveDoc
}
const ALLOW_CREATE = {
  _id: 'test:permission:AllowCreate' as Ref<Permission>,
  objectClass: OBJECT_CLASS,
  txClass: core.class.TxCreateDoc
}
const ALLOW_UPDATE = {
  _id: 'test:permission:AllowUpdate' as Ref<Permission>,
  objectClass: OBJECT_CLASS,
  txClass: core.class.TxUpdateDoc
}
const MODEL_PERMISSIONS = [ALLOW_REMOVE, ALLOW_CREATE, ALLOW_UPDATE]

const mockGetClient = jest.fn(() => ({
  getHierarchy: () => ({
    getAncestors: (_class: Ref<Class<Doc>>) => [_class, core.class.Doc],
    isMixin: () => false
  }),
  getModel: () => ({
    findAllSync: (_class: unknown, query: { txClass: any }) => {
      const txClasses: string[] = query.txClass.$in ?? [query.txClass]
      return MODEL_PERMISSIONS.filter((p) => txClasses.includes(p.txClass))
    }
  })
}))

jest.mock('@hcengineering/presentation', () => ({
  getClient: () => mockGetClient()
}))

function storeWith (...permissions: Array<Ref<Permission>>): PermissionsStore {
  return {
    ps: { [SPACE]: new Set(permissions) },
    ap: {},
    ms: {},
    whitelist: new Set(),
    restrictedSpaces: new Set([SPACE])
  }
}

describe('space forbid permissions in view helpers', () => {
  beforeEach(() => {
    mockGetClient.mockClear()
  })

  it.each([
    ['forbid first', [core.permission.ForbidDeleteObject, ALLOW_REMOVE._id]],
    ['allow first', [ALLOW_REMOVE._id, core.permission.ForbidDeleteObject]]
  ])('canRemoveDoc: ForbidDeleteObject wins over a class delete permission (%s)', (_name, permissions) => {
    expect(canRemoveDoc(OBJECT_CLASS, SPACE, storeWith(...permissions))).toBe(false)
  })

  it('canRemoveDoc: a class delete permission alone still allows removal', () => {
    expect(canRemoveDoc(OBJECT_CLASS, SPACE, storeWith(ALLOW_REMOVE._id))).toBe(true)
    expect(mockGetClient).toHaveBeenCalled()
  })

  it('canCreateObject: ForbidCreateObject wins over a class create permission', () => {
    const forbidden = storeWith(ALLOW_CREATE._id, core.permission.ForbidCreateObject)
    expect(canCreateObject(OBJECT_CLASS, SPACE, forbidden)).toBe(false)
    expect(canCreateObject(OBJECT_CLASS, SPACE, storeWith(ALLOW_CREATE._id))).toBe(true)
  })

  it('canChangeDoc: ForbidUpdateObject wins over a class update permission', () => {
    const forbidden = storeWith(ALLOW_UPDATE._id, core.permission.ForbidUpdateObject)
    expect(canChangeDoc(OBJECT_CLASS, SPACE, forbidden)).toBe(false)
    expect(canChangeDoc(OBJECT_CLASS, SPACE, storeWith(ALLOW_UPDATE._id))).toBe(true)
  })
})
