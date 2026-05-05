import { type PersonId } from '@hcengineering/core'
import { type Location } from '@hcengineering/ui'

export type GithubConnectAction =
  | { action: 'authorize', payload: { accountId: PersonId, code: string, state: string, workspace: string } }
  | {
      action: 'installation',
      payload: { accountId: PersonId, installationId: number, token: string, workspace: string }
    }
  | { action: 'close' }
  | { action: 'idle' }
  | { action: 'selector', installationId?: number }

export function resolveGithubConnectAction (loc: Location): GithubConnectAction {
  if (loc.query?.error != null) {
    return { action: 'close' }
  }

  const installationId = parseInt(loc.query?.installation_id ?? '-1')
  const parsedInstallationId = Number.isFinite(installationId) && installationId >= 0 ? installationId : undefined
  const state = loc.query?.state
  const code = loc.query?.code
  const setupAction = loc.query?.setup_action

  if (state == null || state === '') {
    if (setupAction === 'install') {
      return { action: 'selector', installationId: parsedInstallationId }
    }
    return { action: 'idle' }
  }

  const rawState = JSON.parse(atob(state)) as {
    accountId: PersonId
    op: string
    token: string
    workspace: string
  }

  if (rawState.op === 'installation') {
    if (parsedInstallationId == null || setupAction == null) {
      return { action: 'close' }
    }

    return {
      action: 'installation',
      payload: {
        installationId: parsedInstallationId,
        workspace: rawState.workspace,
        accountId: rawState.accountId,
        token: rawState.token
      }
    }
  }

  if (typeof code === 'string' && code !== '') {
    return {
      action: 'authorize',
      payload: {
        code,
        state,
        workspace: rawState.workspace,
        accountId: rawState.accountId
      }
    }
  }

  return { action: 'close' }
}
