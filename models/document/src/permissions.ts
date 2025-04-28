import type { Builder } from '@hcengineering/model'
import core from '@hcengineering/core'
import document from '@hcengineering/document'

export function definePermissions (builder: Builder): void {
  builder.createDoc(
    core.class.Permission,
    core.space.Model,
    {
      label: document.string.ForbidCreateTeamspacePermission,
      scope: 'workspace',
      txClass: core.class.TxCreateDoc,
      objectClass: document.class.Teamspace,
      forbid: true,
      description: document.string.ForbidCreateTeamspacePermissionDescription
    },
    document.permission.ForbidCreateTeamspace
  )
}
