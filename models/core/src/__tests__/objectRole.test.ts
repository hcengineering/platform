//
// Copyright © 2026 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
//

import core, {
  DOMAIN_MODEL,
  Hierarchy,
  type ArrOf,
  type Class,
  type Doc,
  type ObjectRole,
  type Permission,
  type Ref,
  type RefTo
} from '@hcengineering/core'
import { Builder } from '@hcengineering/model'

import { createModel } from '..'

function buildHierarchy (): Hierarchy {
  const builder = new Builder()
  createModel(builder)
  const hierarchy = new Hierarchy()
  for (const tx of builder.getTxes()) {
    hierarchy.tx(tx)
  }
  return hierarchy
}

describe('ObjectRole model', () => {
  const hierarchy = buildHierarchy()

  it('registers ObjectRole as a model class derived from Doc', () => {
    expect(hierarchy.hasClass(core.class.ObjectRole)).toBe(true)
    expect(hierarchy.isDerived(core.class.ObjectRole, core.class.Doc)).toBe(true)
    expect(hierarchy.findDomain(core.class.ObjectRole)).toBe(DOMAIN_MODEL)
    expect(hierarchy.getClass(core.class.ObjectRole).label).toBe(core.string.Role)
  })

  it('declares ObjectRole.permissions as an array of Permission refs', () => {
    const attr = hierarchy.findAttribute(core.class.ObjectRole, 'permissions')
    expect(attr).toBeDefined()
    expect(attr?.type._class).toBe(core.class.ArrOf)
    expect(((attr?.type as ArrOf<Ref<Permission>>).of as RefTo<Permission>).to).toBe(core.class.Permission)
  })

  it('declares ObjectRole name, description and objectClass as model attributes', () => {
    const name = hierarchy.findAttribute(core.class.ObjectRole, 'name')
    expect(name?.type._class).toBe(core.class.TypeIntlString)
    expect(name?.label).toBe(core.string.Name)

    const description = hierarchy.findAttribute(core.class.ObjectRole, 'description')
    expect(description?.type._class).toBe(core.class.TypeIntlString)
    expect(description?.label).toBe(core.string.Description)

    const objectClass = hierarchy.findAttribute(core.class.ObjectRole, 'objectClass')
    expect(objectClass?.type._class).toBe(core.class.RefTo)
    expect((objectClass?.type as RefTo<Class<Doc>>).to).toBe(core.class.Class)
    expect(objectClass?.label).toBe(core.string.Class)
  })

  it('declares Collaborator.role as a reference to ObjectRole', () => {
    const role = hierarchy.findAttribute(core.class.Collaborator, 'role')
    expect(role).toBeDefined()
    expect(role?.type._class).toBe(core.class.RefTo)
    expect((role?.type as RefTo<ObjectRole>).to).toBe(core.class.ObjectRole)
    expect(role?.label).toBe(core.string.Role)
  })
})
