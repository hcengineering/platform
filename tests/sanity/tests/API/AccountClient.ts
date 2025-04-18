import { getClient as getClientRaw, type AccountClient } from '@hcengineering/account-client'
import { LocalUrl, PlatformAdmin } from '../utils'

let adminAccountClient: AccountClient

export async function getAdminAccountClient (): Promise<AccountClient> {
  if (adminAccountClient != null) {
    return adminAccountClient
  }

  const unauthClient = getClientRaw(LocalUrl)
  const loginInfo = await unauthClient.login(PlatformAdmin, '1234')

  if (loginInfo == null) {
    throw new Error('Failed to login as admin')
  }

  adminAccountClient = getClientRaw(LocalUrl, loginInfo.token)
  return adminAccountClient
}
