import type { Builder } from '@hcengineering/model'
import core from '@hcengineering/core'
import document from '@hcengineering/document'

export function definePermissions (builder: Builder): void {
  builder.createDoc(
    core.class.Permission,
    core.space.Model,
    {
      label: document.string.CreateTeamspacePermission,
      scope: 'workspace',
      description: document.string.CreateTeamspacePermissionDescription
    },
    document.permission.CreateTeamspace
  )
}
