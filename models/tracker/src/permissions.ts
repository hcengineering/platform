import type { Builder } from '@hcengineering/model'
import core from '@hcengineering/core'
import tracker from '@hcengineering/tracker'

export function definePermissions (builder: Builder): void {
  builder.createDoc(
    core.class.Permission,
    core.space.Model,
    {
      label: tracker.string.ForbidCreateProjectPermission,
      txClass: core.class.TxCreateDoc,
      objectClass: tracker.class.Project,
      forbid: true,
      scope: 'workspace',
      description: tracker.string.ForbidCreateProjectPermissionDescription
    },
    tracker.permission.ForbidCreateProject
  )
}
