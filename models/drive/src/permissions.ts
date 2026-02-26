import type { Builder } from '@hcengineering/model'
import core from '@hcengineering/core'
import drive from '@hcengineering/drive'

export function definePermissions (builder: Builder): void {
  builder.createDoc(
    core.class.Permission,
    core.space.Model,
    {
      scope: 'space',
      label: drive.string.CreateFilePermission,
      description: drive.string.CreateFilePermissionDescription,
      txClass: core.class.TxCreateDoc,
      objectClass: drive.class.File
    },
    drive.permission.CreateFile
  )

  builder.createDoc(
    core.class.Permission,
    core.space.Model,
    {
      scope: 'space',
      label: drive.string.UpdateFilePermission,
      description: drive.string.UpdateFilePermissionDescription,
      txClass: core.class.TxUpdateDoc,
      objectClass: drive.class.File
    },
    drive.permission.UpdateFile
  )

  builder.createDoc(
    core.class.Permission,
    core.space.Model,
    {
      scope: 'space',
      label: drive.string.RemoveFilePermission,
      description: drive.string.RemoveFilePermissionDescription,
      txClass: core.class.TxRemoveDoc,
      objectClass: drive.class.File
    },
    drive.permission.RemoveFile
  )

  builder.createDoc(
    core.class.Permission,
    core.space.Model,
    {
      scope: 'space',
      label: drive.string.CreateFolderPermission,
      description: drive.string.CreateFolderPermissionDescription,
      txClass: core.class.TxCreateDoc,
      objectClass: drive.class.Folder
    },
    drive.permission.CreateFolder
  )

  builder.createDoc(
    core.class.Permission,
    core.space.Model,
    {
      scope: 'space',
      label: drive.string.UpdateFolderPermission,
      description: drive.string.UpdateFolderPermissionDescription,
      txClass: core.class.TxUpdateDoc,
      objectClass: drive.class.Folder
    },
    drive.permission.UpdateFolder
  )

  builder.createDoc(
    core.class.Permission,
    core.space.Model,
    {
      scope: 'space',
      label: drive.string.RemoveFolderPermission,
      description: drive.string.RemoveFolderPermissionDescription,
      txClass: core.class.TxRemoveDoc,
      objectClass: drive.class.Folder
    },
    drive.permission.RemoveFolder
  )

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
