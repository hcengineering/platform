import type { LoginInfoWithWorkspaces, LoginInfoWorkspace } from '@hcengineering/account-client'
import core, {
  AccountRole,
  SocialIdType,
  systemAccountUuid,
  type AccountUuid,
  type PersonId,
  type WorkspaceInfoWithStatus,
  type WorkspaceUuid
} from '@hcengineering/core'
import { decodeToken } from '@hcengineering/server-token'
import type { TSessionManager } from '../sessionManager'

export const workspaces: Record<WorkspaceUuid, LoginInfoWorkspace> = {
  ['test1' as WorkspaceUuid]: {
    url: 'test',
    mode: 'active',
    version: { versionMajor: 1, versionMinor: 0, versionPatch: 0 },
    name: 'test',
    role: AccountRole.Owner,
    endpoint: {
      internalUrl: 'endpoint',
      externalUrl: 'endpoint',
      region: 'region'
    }
  },
  ['test2' as WorkspaceUuid]: {
    url: 'test2',
    mode: 'active',
    version: { versionMajor: 1, versionMinor: 0, versionPatch: 0 },
    name: 'test2',
    role: AccountRole.Owner,
    endpoint: {
      internalUrl: 'endpoint2',
      externalUrl: 'endpoint2',
      region: 'region2'
    }
  },
  ['test3' as WorkspaceUuid]: {
    url: 'test3',
    mode: 'active',
    version: { versionMajor: 1, versionMinor: 0, versionPatch: 0 },
    name: 'test3',
    role: AccountRole.Owner,
    endpoint: {
      internalUrl: 'endpoint2',
      externalUrl: 'endpoint2',
      region: 'region2'
    }
  }
}

export const workspaceRef = {
  test1: { ...workspaces['test1' as WorkspaceUuid], uuid: 'test1' as WorkspaceUuid },
  test2: { ...workspaces['test2' as WorkspaceUuid], uuid: 'test2' as WorkspaceUuid },
  test3: { ...workspaces['test3' as WorkspaceUuid], uuid: 'test3' as WorkspaceUuid }
}

export function hookSessionManagerAccount (sessionManager: TSessionManager): void {
  ;(sessionManager as any).getWorkspaceInfo = async (
    token: string,
    updateLastVisit: boolean = false
  ): Promise<WorkspaceInfoWithStatus> => {
    const tok = decodeToken(token)
    const info = workspaces[tok.workspace]
    return {
      uuid: tok.workspace,
      url: info.url,
      region: info.endpoint.region,
      versionMajor: info.version.versionMajor,
      versionMinor: info.version.versionMinor,
      versionPatch: info.version.versionPatch,
      lastVisit: Date.now(),
      mode: info.mode,
      processingProgress: info.progress ?? 0,
      name: info.name ?? '',
      createdOn: new Date('2022-01-01').getTime(),
      endpoint: info.endpoint
    }
  }
  sessionManager.getLoginWithWorkspaceInfo = async (token: string): Promise<LoginInfoWithWorkspaces> => {
    const tok = decodeToken(token)
    if (tok.account === systemAccountUuid) {
      return {
        account: tok.account,
        personalWorkspace: core.workspace.Any,
        socialIds: [],
        workspaces: {}
      }
    }
    return {
      account: tok.account,
      personalWorkspace: tok.workspace,
      workspaces,
      socialIds: [
        {
          _id: ('sid' + tok.account) as PersonId,
          type: SocialIdType.EMAIL,
          value: tok.account + '@test.com',
          key: tok.account + '@test.com',
          personUuid: tok.account
        }
      ]
    }
  }
}
