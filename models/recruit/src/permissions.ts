import type { Builder } from '@hcengineering/model'
import core from '@hcengineering/core'
import recruit from '@hcengineering/recruit'

export function definePermissions (builder: Builder): void {
  builder.createDoc(
    core.class.Permission,
    core.space.Model,
    {
      label: recruit.string.ForbidCreateVacancyPermission,
      scope: 'workspace',
      txClass: core.class.TxCreateDoc,
      objectClass: recruit.class.Vacancy,
      forbid: true,
      description: recruit.string.ForbidCreateVacancyPermissionDescription
    },
    recruit.permission.ForbidCreateVacancy
  )
}
