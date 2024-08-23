import { Client } from '@hcengineering/core'
import { createClient } from '@hcengineering/server-client'

export async function connectPlatform (token: string, endpoint: string): Promise<Client> {
  return await createClient(endpoint, token)
}
