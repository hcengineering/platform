import type { AccountUuid, PersonId, WorkspaceUuid } from '@hcengineering/core'

export const githubLogErrorCategory = {
  installationMapping: 'installation-mapping-failed',
  oauthCallback: 'oauth-callback-failed'
} as const

export function getInstallationLogContext<T extends PersonId | AccountUuid> (
  workspace: WorkspaceUuid,
  accountId: T,
  installationId: number
): { workspace: WorkspaceUuid, accountId: T, installationId: number } {
  return { workspace, accountId, installationId }
}

export function getOAuthCallbackLogContext (
  workspace: WorkspaceUuid,
  accountId: PersonId
): { workspace: WorkspaceUuid, accountId: PersonId } {
  return { workspace, accountId }
}
