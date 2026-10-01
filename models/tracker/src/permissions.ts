import type { Builder } from '@hcengineering/model'
import core, { type Permission, type Ref } from '@hcengineering/core'
import { type IntlString } from '@hcengineering/platform'
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

  defineIssuePermissions(builder)
}

/**
 * Object-scoped Issue permissions, intended to be grouped into ObjectRoles and
 * granted on a single issue via Collaborator.role.
 *
 * Declarations only: no txClass/txMatch/forbid on purpose. SpacePermissionsMiddleware
 * treats any Permission with a matching objectClass and txClass as a restriction in
 * restricted spaces, so adding txClass here would change behaviour. Write-path matching
 * (txClass/txMatch) is added together with enforcement.
 */
function defineIssuePermissions (builder: Builder): void {
  const issuePermissions: Array<[Ref<Permission>, IntlString, IntlString]> = [
    [
      tracker.permission.CommentOnIssue,
      tracker.string.CommentOnIssuePermission,
      tracker.string.CommentOnIssuePermissionDescription
    ],
    [tracker.permission.EditIssue, tracker.string.EditIssuePermission, tracker.string.EditIssuePermissionDescription],
    [
      tracker.permission.TransitionIssue,
      tracker.string.TransitionIssuePermission,
      tracker.string.TransitionIssuePermissionDescription
    ],
    [
      tracker.permission.DeleteIssue,
      tracker.string.DeleteIssuePermission,
      tracker.string.DeleteIssuePermissionDescription
    ]
  ]

  for (const [id, label, description] of issuePermissions) {
    builder.createDoc(
      core.class.Permission,
      core.space.Model,
      {
        label,
        description,
        scope: 'object',
        objectClass: tracker.class.Issue
      },
      id
    )
  }
}
