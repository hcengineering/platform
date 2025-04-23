import type { Builder } from '@hcengineering/model'
import core from '@hcengineering/core'
import drive from '@hcengineering/drive'

export function definePermissions (builder: Builder): void {
  builder.createDoc(
    core.class.Permission,
    core.space.Model,
    {
      label: drive.string.CreateDrivePermission,
      scope: 'workspace',
      description: drive.string.CreateDrivePermissionDescription
    },
    drive.permission.CreateDrive
  )
}
