//
// Copyright © 2025 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
//

import { timeouts, type TickManager } from '@hcengineering/network-core'
import { v4 as uuidv4 } from 'uuid'
import * as zmq from 'zeromq'
import { backrpcOperations, type ClientId } from './types'

import { context } from './context'

export interface BackRPCServerHandler<ClientT> {
  requestHandler: (
    client: ClientT,
    method: string,
    params: any,
    send: (response: any) => Promise<void>
  ) => Promise<void>
  helloHandler?: (client: ClientT) => Promise<void>
  handleTimeout?: (client: ClientT) => Promise<void>
}

interface RPCClientInfo<ClientT extends string> {
  id: ClientT
  lastSeen: number
  requests: Set<string>
  requestsTotal: number
  requestsTime: number
  helloCounter: number
}

export class BackRPCServer<ClientT extends string = ClientId> {
  uuid = uuidv4()

  private readonly router: zmq.Router

  private requestCounter: number = 0

  private readonly backRequests = new Map<string, { resolve: (data: any) => void, reject: (err: any) => void }>()

  private readonly clientMapping = new Map<ClientT, zmq.Message>()
  private readonly revClientMapping = new Map<string, RPCClientInfo<ClientT>>()

  private closed: boolean = false

  private bound: Promise<void> | undefined

  // A limit of requests per one client.
  requestsLimit: number = 25

  stopTick?: () => void

  constructor (
    private readonly handlers: BackRPCServerHandler<ClientT>,
    private readonly tickMgr: TickManager,
    readonly host: string = '*',
    private readonly port: number = 0
  ) {
    this.router = new zmq.Router({ context })

    this.stopTick = this.tickMgr.register(() => {
      void this.checkAlive().catch(err => {
        console.error(err)
      })
    }, timeouts.pingInterval)

    void this.start()
  }

  async checkAlive (): Promise<void> {
    const now = this.tickMgr.now()
    // Handle outdated clients
    for (const [clientId, clientRecord] of this.revClientMapping.entries()) {
      const timeSinceLastSeen = now - clientRecord.lastSeen

      if (timeSinceLastSeen > timeouts.aliveTimeout * 1000) {
        console.warn(
          `Client ${clientId} has been inactive for ${Math.round(timeSinceLastSeen / 1000)}s, marking as dead`
        )
        await this.handlers.handleTimeout?.(clientRecord.id)
        this.revClientMapping.delete(clientId)
        this.clientMapping.delete(clientRecord.id)
      }
    }
  }

  async getPort (): Promise<number> {
    await this.bound
    const reqEndpoint = this.router.lastEndpoint
    if (reqEndpoint === null) {
      throw new Error('Router is not bound to an endpoint')
    }

    const portMatch = reqEndpoint.match(/:(\d+)$/)
    const port = portMatch != null ? parseInt(portMatch[1]) : undefined
    if (port === undefined) {
      throw new Error('Router is not bound to a port')
    }
    return port
  }

  private async start (): Promise<void> {
    this.bound = this.router.bind(`tcp://${this.host}:${this.port}`)
    await this.bound

    // Read messages from clients.
    for await (const msg of this.router) {
      if (this.closed) {
        return
      }
      try {
        const clientId = msg[0]
        const clientIdText = clientId.toString('base64')
        const [operation, reqId, payload] = [parseInt(msg[1].toString()), msg[2].toString(), msg[3]]

        const client = this.revClientMapping.get(clientIdText)
        if (client !== undefined) {
          client.lastSeen = this.tickMgr.now()
        }
        switch (operation) {
          case backrpcOperations.hello: {
            // Remember clientId to be able to do back requests.
            if (!this.clientMapping.has(reqId.toString() as ClientT)) {
              await this.handlers.helloHandler?.(reqId.toString() as ClientT)
            }
            this.clientMapping.set(reqId.toString() as ClientT, clientId)

            const clientInfo: RPCClientInfo<ClientT> =
              this.revClientMapping.get(clientIdText) ??
              ({
                id: reqId.toString() as ClientT,
                lastSeen: this.tickMgr.now(),
                requests: new Set(),
                requestsTime: 0,
                requestsTotal: 0,
                helloCounter: 0
              } satisfies RPCClientInfo<ClientT>)
            clientInfo.helloCounter++

            this.revClientMapping.set(clientIdText, clientInfo)
            void this.router.send([clientId, backrpcOperations.hello, this.uuid, ''])
            break
          }
          case backrpcOperations.ping: {
            void this.router.send([clientId, backrpcOperations.pong, this.uuid, ''])
            console.log('ping:' + clientIdText)
            break
          }
          case backrpcOperations.request:
            {
              if (client === undefined) {
                // No Client, requests are not possible
                void this.router.send([clientId, backrpcOperations.retry, reqId, JSON.stringify(1)])
                continue
              }
              if (client.requests.has(reqId)) {
                // We already had this request, so continue waiting for response.
                continue
              }
              if (client.requests.size > this.requestsLimit) {
                // No Client, requests are not possible
                void this.router.send([clientId, backrpcOperations.retry, reqId, JSON.stringify(client.requests.size)])
                continue
              }

              client.requestsTotal++

              const [method, params] = JSON.parse(payload.toString())

              const sendError = async (err: Error): Promise<void> => {
                await this.router.send([
                  clientId,
                  backrpcOperations.responseError,
                  reqId,
                  JSON.stringify({
                    message: err.message ?? '',
                    stack: err.stack
                  })
                ])
              }
              client.requests.add(reqId)
              void this.handlers
                .requestHandler(client.id, method, params, async (response: any) => {
                  await this.router.send([clientId, backrpcOperations.response, reqId, JSON.stringify(response)])
                })
                .catch((err) => {
                  void sendError(err)
                })
            }
            break
          case backrpcOperations.response: {
            const reqID = reqId.toString()
            const req = this.backRequests.get(reqID)
            try {
              req?.resolve(JSON.parse(payload.toString()))
            } catch (err: any) {
              console.error(err)
            }
            this.backRequests.delete(reqID)
            break
          }
          case backrpcOperations.responseError: {
            const reqID = reqId.toString()
            const req = this.backRequests.get(reqID)
            try {
              req?.reject(JSON.parse(payload.toString()))
            } catch (err: any) {
              console.error(err)
            }
            this.backRequests.delete(reqID)
            break
          }
        }
      } catch (err: any) {
        console.error(err)
      }
    }
  }

  async request (clientId: ClientT, method: string, params: any): Promise<any> {
    const clientIdentity = this.clientMapping.get(clientId)
    if (clientIdentity === undefined) {
      throw new Error(`Client ${clientId} not found`)
    }
    return await new Promise<any>((resolve, reject) => {
      const reqId = clientId + '-' + this.requestCounter++
      this.backRequests.set(reqId, { resolve, reject })

      void this.router
        .send([clientIdentity, backrpcOperations.request, reqId, JSON.stringify([method, params])])
        .catch((err) => {
          reject(err)
        })
    })
  }

  async send (clientId: ClientT, body: any): Promise<any> {
    const clientIdentity = this.clientMapping.get(clientId)
    if (clientIdentity === undefined) {
      throw new Error(`Client ${clientId as string} not found`)
    }
    await this.router.send([clientIdentity, backrpcOperations.event, '', JSON.stringify(body)])
  }

  async close (): Promise<void> {
    this.closed = true
    this.stopTick?.()
    this.router.close()
  }
}
