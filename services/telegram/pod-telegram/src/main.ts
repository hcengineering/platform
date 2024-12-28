import { IncomingHttpHeaders } from 'http'
import { SocialIdType } from '@hcengineering/core'
import { setMetadata } from '@hcengineering/platform'
import serverClient from '@hcengineering/server-client'
import { initStatisticsContext, type StorageConfiguration } from '@hcengineering/server-core'
import { buildStorageFromConfig, storageConfigFromEnv } from '@hcengineering/server-storage'
import serverToken, { decodeToken, type Token } from '@hcengineering/server-token'

import { PlatformWorker } from './platform'
import { createServer, Handler, listen } from './server'
import { telegram } from './telegram'
import config from './config'

const extractTokenRaw = (headers: IncomingHttpHeaders): string | undefined => {
  return headers.authorization?.slice(7)
}

const extractToken = (headers: IncomingHttpHeaders): Token | undefined => {
  try {
    return decodeToken(extractTokenRaw(headers) ?? '')
  } catch {
    return undefined
  }
}

export const main = async (): Promise<void> => {
  const ctx = initStatisticsContext('telegram', {})

  setMetadata(serverClient.metadata.Endpoint, config.AccountsURL)
  setMetadata(serverClient.metadata.UserAgent, config.ServiceID)
  setMetadata(serverToken.metadata.Secret, config.Secret)

  const storageConfig: StorageConfiguration = storageConfigFromEnv()
  const storageAdapter = buildStorageFromConfig(storageConfig)

  const platformWorker = await PlatformWorker.create(ctx, storageAdapter)
  // TODO: FIXME
  const endpoints: Array<[string, Handler]> = []
  // [
  //   [
  //     '/signin',
  //     async (req, res) => {
  //       const token = extractToken(req.headers)
  //       const rawToken = extractTokenRaw(req.headers)

  //       if (token === undefined || rawToken === undefined) {
  //         res.status(401).send()
  //         return
  //       }

  //       const { workspace } = token
  //       const phone = req.body?.phone
  //       if (phone === undefined) {
  //         res.status(400).send({ err: "'phone' is missing" })
  //         return
  //       }

  //       const existingRec = await platformWorker.getUserRecord({
  //         phone,
  //         workspace
  //       })

  //       if (existingRec !== undefined) {
  //         const socialIds = await getSocialIds(rawToken)

  //         const email = socialIds.find((si) => si.type === SocialIdType.EMAIL)?.value

  //         if (existingRec.email === email) {
  //           res.send({
  //             next: 'end'
  //           })
  //         } else {
  //           res.status(400).send({ err: 'Phone number already in use' })
  //         }

  //         return
  //       }

  //       const next = await telegram.auth(phone)
  //       res.send({ next })
  //     }
  //   ],
  //   [
  //     '/signin/code',
  //     async (req, res) => {
  //       const token = extractToken(req.headers)

  //       if (token === undefined) {
  //         res.status(401).send()
  //         return
  //       }

  //       const { workspace } = token
  //       const phone = req.body?.phone
  //       if (phone === undefined) {
  //         res.status(400).send({ err: "'phone' is missing" })
  //         return
  //       }

  //       const existingRec = await platformWorker.getUserRecord({
  //         phone,
  //         workspace
  //       })

  //       if (existingRec !== undefined) {
  //         if (existingRec.email === email) {
  //           res.send({
  //             next: 'end'
  //           })
  //         } else {
  //           res.status(400).send({ err: 'Phone number already in use' })
  //         }

  //         return
  //       }

  //       const done = await telegram.authCode(phone, req.body.code ?? '')

  //       if (done) {
  //         const conn = telegram.getConnection(phone)

  //         if (conn !== undefined) {
  //           await platformWorker.addUser({
  //             email,
  //             workspace: workspace.name,
  //             phone,
  //             conn
  //           })
  //           telegram.forgetConnection(phone)
  //         }
  //       }

  //       res.send({
  //         next: done ? 'end' : 'pass'
  //       })
  //     }
  //   ],
  //   [
  //     '/signin/pass',
  //     async (req, res) => {
  //       const token = extractToken(req.headers)

  //       if (token === undefined) {
  //         res.status(401).send()
  //         return
  //       }

  //       const { email, workspace } = token
  //       const phone = req.body?.phone
  //       if (phone === undefined) {
  //         res.status(400).send({ err: "'phone' is missing" })
  //         return
  //       }

  //       const existingRec = await platformWorker.getUserRecord({
  //         phone,
  //         workspace
  //       })

  //       if (existingRec !== undefined) {
  //         if (existingRec.email === email) {
  //           res.send({
  //             next: 'end'
  //           })
  //         } else {
  //           res.status(400).send({ err: 'Phone number already in use' })
  //         }

  //         return
  //       }

  //       await telegram.authPass(phone, req.body.pass ?? '')

  //       const conn = telegram.getConnection(phone)

  //       if (conn !== undefined) {
  //         await platformWorker.addUser({
  //           email,
  //           workspace,
  //           phone,
  //           conn
  //         })
  //         telegram.forgetConnection(phone)
  //       }

  //       res.send({ next: 'end' })
  //     }
  //   ],
  //   [
  //     '/signout',
  //     async (req, res) => {
  //       const token = extractToken(req.headers)

  //       if (token === undefined) {
  //         res.status(401).send()
  //         return
  //       }

  //       const { email, workspace } = token
  //       await platformWorker.removeUser({ email, workspace })

  //       res.send()
  //     }
  //   ]
  // ]

  const server = listen(createServer(endpoints), config.Port, config.Host)

  const asyncClose = async (): Promise<void> => {
    await platformWorker.close()
    await storageAdapter.close()
  }

  const shutdown = (): void => {
    server.close()

    void asyncClose().then(() => process.exit())
  }

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
  process.on('uncaughtException', (e) => {
    console.error(e)
  })
  process.on('unhandledRejection', (e) => {
    console.error(e)
  })
}
