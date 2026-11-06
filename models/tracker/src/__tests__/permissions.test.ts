//
// Copyright © 2026 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
//

import core, { type Permission, type Ref, type TxCreateDoc } from '@hcengineering/core'
import { Builder } from '@hcengineering/model'
import tracker from '@hcengineering/tracker'

import { definePermissions } from '../permissions'

function declaredPermissions (): Array<TxCreateDoc<Permission>> {
  return builderTxes()
    .filter((tx): tx is TxCreateDoc<Permission> => tx._class === core.class.TxCreateDoc)
    .filter((tx) => tx.objectClass === core.class.Permission)
}

const issuePermissions: Array<Ref<Permission>> = [
  tracker.permission.CommentOnIssue,
  tracker.permission.EditIssue,
  tracker.permission.TransitionIssue,
  tracker.permission.DeleteIssue
]

describe('tracker definePermissions', () => {
  const txes = declaredPermissions()

  it.each(issuePermissions)('declares %s once as an object-scoped Issue permission without enforcement hooks', (id) => {
    const matches = txes.filter((tx) => tx.objectId === id)
    expect(matches).toHaveLength(1)
    const attrs = matches[0].attributes
    expect(attrs.scope).toBe('object')
    expect(attrs.objectClass).toBe(tracker.class.Issue)
    expect(attrs.label).toBeDefined()
    expect(attrs.description).toBeDefined()
    // No txClass/txMatch/forbid: SpacePermissionsMiddleware would otherwise treat them
    // as restrictions in restricted spaces. Enforcement comes in a follow-up.
    expect(attrs.txClass).toBeUndefined()
    expect(attrs.txMatch).toBeUndefined()
    expect(attrs.forbid).toBeUndefined()
  })

  it('does not create ObjectRole instances', () => {
    const objectRoles = builderTxes().filter(
      (tx) => tx._class === core.class.TxCreateDoc && (tx as TxCreateDoc<any>).objectClass === core.class.ObjectRole
    )
    expect(objectRoles).toHaveLength(0)
  })

  it('keeps ForbidCreateProject unchanged', () => {
    const matches = txes.filter((tx) => tx.objectId === tracker.permission.ForbidCreateProject)
    expect(matches).toHaveLength(1)
    expect(matches[0].attributes).toEqual({
      label: tracker.string.ForbidCreateProjectPermission,
      txClass: core.class.TxCreateDoc,
      objectClass: tracker.class.Project,
      forbid: true,
      scope: 'workspace',
      description: tracker.string.ForbidCreateProjectPermissionDescription
    })
  })
})

function builderTxes (): ReturnType<Builder['getTxes']> {
  const builder = new Builder()
  definePermissions(builder)
  return builder.getTxes()
}
