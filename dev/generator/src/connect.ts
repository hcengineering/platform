import client from '@hcengineering/client'
import clientResources from '@hcengineering/client-resources'
import { Client } from '@hcengineering/core'
import { setMetadata } from '@hcengineering/platform'
import { generateToken } from '@hcengineering/server-token'

// eslint-disable-next-line
const WebSocket = require('ws')

export async function connect (transactorUrl: string, workspace: string): Promise<Client> {
  console.log('connecting to transactor...')
  const token = generateToken('anticrm@hc.engineering', workspace)

  // We need to override default factory with 'ws' one.
  setMetadata(client.metadata.ClientSocketFactory, (url) => new WebSocket(url))
  return await (await clientResources()).function.GetClient(token, transactorUrl)
}
