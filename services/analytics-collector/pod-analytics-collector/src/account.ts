import config from './config'
import { WorkspaceLoginInfo } from '@hcengineering/account'

export async function getWorkspaceInfo (token: string): Promise<WorkspaceLoginInfo | undefined> {
  const accountsUrl = config.AccountsUrl
  const workspaceInfo = await (
    await fetch(accountsUrl, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        method: 'getWorkspaceInfo',
        params: []
      })
    })
  ).json()

  return workspaceInfo.result as WorkspaceLoginInfo
}
