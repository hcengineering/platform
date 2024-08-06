import { Client } from '@hcengineering/core'
import { createClient, getTransactorEndpoint } from '@hcengineering/server-client'

export async function connectPlatform (token: string): Promise<Client> {
  const endpoint = await getTransactorEndpoint(token)
  return await createClient(endpoint, token)
}
