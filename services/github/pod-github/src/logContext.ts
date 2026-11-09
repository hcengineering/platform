import { Analytics } from '@hcengineering/analytics'
import type { AccountUuid, MeasureContext, PersonId, WorkspaceUuid } from '@hcengineering/core'

export const githubLogErrorCategory = {
  installationMapping: 'installation-mapping-failed',
  installationRemoval: 'installation-removal-failed',
  oauthCallback: 'oauth-callback-failed',
  oauthExchange: 'oauth-exchange-failed',
  oauthTokenRefresh: 'oauth-token-refresh-failed'
} as const

export type GithubLogErrorCategory = (typeof githubLogErrorCategory)[keyof typeof githubLogErrorCategory]

/**
 * Deliberately discards the caught error. OAuth and request errors can contain
 * request URLs and credentials in their message, stack, or cause.
 */
export function createGithubCredentialSafeError (category: GithubLogErrorCategory): Error {
  return new Error(category)
}

export function reportGithubCredentialError (
  ctx: Pick<MeasureContext, 'error'>,
  message: string,
  category: GithubLogErrorCategory,
  context: Record<string, unknown> = {}
): Error {
  const error = createGithubCredentialSafeError(category)
  Analytics.handleError(error)
  ctx.error(message, { ...context, error: category })
  return error
}

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
