// import { Client } from '@hcengineering/core'
// import { setMetadata } from '@hcengineering/platform'
// import client from '@hcengineering/client'
// import clientResources from '@hcengineering/client-resources'
//
// import config from './config'
//
// // eslint-disable-next-line
// const WebSocket = require('ws')
//
// export async function connectPlatform (token: string): Promise<Client> {
//   // We need to override default factory with 'ws' one.
//   setMetadata(client.metadata.ClientSocketFactory, (url) => {
//     return new WebSocket(url, {
//       headers: {
//         'User-Agent': config.ServiceID
//       }
//     })
//   })
//   return await (await clientResources()).function.GetClient(token, config.TransactorURL)
// }
