
import client from '@anticrm/client'
import clientResources from '@anticrm/client-resources'
import { Client } from '@anticrm/core'
import { setMetadata } from '@anticrm/platform'
import { encode } from 'jwt-simple'

// eslint-disable-next-line
const WebSocket = require('ws')

export async function connect (transactorUrl: string, workspace: string): Promise<Client> {
  console.log('connecting to transactor...')
  const token = encode({ email: 'anticrm@hc.engineering', workspace }, 'secret')

  // We need to override default factory with 'ws' one.
  setMetadata(client.metadata.ClientSocketFactory, (url) => new WebSocket(url))
  return await (await clientResources()).function.GetClient(token, transactorUrl)
}
