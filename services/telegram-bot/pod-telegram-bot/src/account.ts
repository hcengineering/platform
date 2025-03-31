import { AccountUuid, Person } from '@hcengineering/core'
import { getAccountClient } from '@hcengineering/server-client'
import { generateToken } from '@hcengineering/server-token'

export async function getAccountPerson (account: AccountUuid): Promise<Person | undefined> {
  try {
    const accountClient = getAccountClient(generateToken(account))
    return await accountClient.getPerson()
  } catch (e) {
    console.error(e)
  }
  return undefined
}
