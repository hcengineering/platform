//
// Copyright © 2026 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
//

import core, {
  DOMAIN_MODEL,
  Hierarchy,
  type AccountUuid,
  type Collaborator,
  type ObjectRole,
  type Permission,
  type Ref
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
    expect((attr?.type as any).of.to).toBe(core.class.Permission)
  })

  it('keeps Collaborator.role optional (structural collaborators stay valid)', () => {
    const structural: Pick<Collaborator, 'collaborator' | 'role'> = { collaborator: 'acc' as AccountUuid }
    const scoped: Pick<Collaborator, 'collaborator' | 'role'> = {
      collaborator: 'acc' as AccountUuid,
      role: 'role' as Ref<ObjectRole>
    }
    expect(structural.role).toBeUndefined()
    expect(scoped.role).toBe('role')
  })

  it('accepts the object permission scope', () => {
    const scope: Permission['scope'] = 'object'
    expect(scope).toBe('object')
  })
})
