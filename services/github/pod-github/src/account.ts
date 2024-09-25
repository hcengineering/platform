import { ClientWorkspaceInfo } from '@hcengineering/account'
import config from './config'

/**
 * @public
 */
export async function getWorkspaceInfo (token: string, updateLastModified = false): Promise<ClientWorkspaceInfo> {
  const accountsUrl = config.AccountsURL
  const workspaceInfo = await (
    await fetch(accountsUrl, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        method: 'getWorkspaceInfo',
        params: updateLastModified ? [true] : []
      })
    })
  ).json()

  return workspaceInfo.result as ClientWorkspaceInfo
}
