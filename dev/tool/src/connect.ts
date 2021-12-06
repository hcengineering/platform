
import client from '@anticrm/client'
import clientResources from '@anticrm/client-resources'
import core, { TxOperations } from '@anticrm/core'
import { setMetadata } from '@anticrm/platform'
import { encode } from 'jwt-simple'

// eslint-disable-next-line
const WebSocket = require('ws')

export async function connect (transactorUrl: string, workspace: string): Promise<{ connection: TxOperations, close: () => Promise<void>}> {
  console.log('connecting to transactor...')
  const token = encode({ email: 'anticrm@hc.engineering', workspace }, 'secret')

  // We need to override default factory with 'ws' one.
  setMetadata(client.metadata.ClientSocketFactory, (url) => new WebSocket(url))
  const connection = await (await clientResources()).function.GetClient(token, transactorUrl)
  return {
    connection: new TxOperations(connection, core.account.System),
    close: async () => {
      await connection.close()
    }
  }
}
