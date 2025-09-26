import type { Builder } from '@hcengineering/model'
import core from '@hcengineering/core'
import drive from '@hcengineering/drive'

export function definePermissions (builder: Builder): void {
  builder.createDoc(
    core.class.Permission,
    core.space.Model,
    {
      label: drive.string.ForbidCreateDrivePermission,
      scope: 'workspace',
      txClass: core.class.TxCreateDoc,
      objectClass: drive.class.Drive,
      forbid: true,
      description: drive.string.ForbidCreateDrivePermissionDescription
    },
    drive.permission.ForbidCreateDrive
  )
}
