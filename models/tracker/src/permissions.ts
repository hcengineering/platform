import type { Builder } from '@hcengineering/model'
import core from '@hcengineering/core'
import tracker from '@hcengineering/tracker'

export function definePermissions (builder: Builder): void {
  builder.createDoc(
    core.class.Permission,
    core.space.Model,
    {
      label: tracker.string.CreateProjectPermission,
      scope: 'workspace',
      description: tracker.string.CreateProjectPermissionDescription
    },
    tracker.permission.CreateProject
  )
}
