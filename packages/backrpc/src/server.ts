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
  closeHandler?: (client: ClientT, timeout: boolean) => Promise<void>
  onPing?: (client: ClientT) => void
}

interface RPCClientInfo<ClientT extends string> {
  id: ClientT
  lastSeen: number
  requests: Set<string>
  requestsTotal: number
  requestsTime: number
  helloCounter: number
  aliveTimeout: number // Per-client timeout in seconds
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
    private readonly port: number = 0,
    private readonly options: zmq.SocketOptions<zmq.Router> = {}
  ) {
    this.router = new zmq.Router({
      ...options,
      context,
      // linger: 0,
      tcpKeepalive: 1
    })

    this.stopTick = this.tickMgr.register(async () => {
      await this.checkAlive()
    }, timeouts.pingInterval)

    void this.start()
  }

  async checkAlive (): Promise<void> {
    this.stats.hellos = 0
    this.stats.pings = 0
    this.stats.requests = 0
    this.stats.responses = 0
    const now = this.tickMgr.now()
    // Handle outdated clients
    for (const [clientId, clientRecord] of [...this.revClientMapping.entries()]) {
      const timeSinceLastSeen = now - clientRecord.lastSeen

      // Use per-client timeout instead of global timeout
      if (timeSinceLastSeen > clientRecord.aliveTimeout * 1000) {
        console.warn(
          `Client ${clientId} has been inactive for ${Math.round(timeSinceLastSeen / 1000)}s (timeout: ${clientRecord.aliveTimeout}s), marking as dead`
        )
        this.handleClose(clientRecord.id, clientId, true)
      }
    }
  }

  private handleClose (clientRecordId: ClientT, clientId: string, timeout: boolean): void {
    void this.handlers.closeHandler?.(clientRecordId, timeout).catch((err) => {
      console.error('Error in handleTimeout', err)
    })
    this.revClientMapping.delete(clientId)
    this.clientMapping.delete(clientRecordId)
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

  private sendPromise: Promise<void> | undefined

  async doSend (msg: any[]): Promise<void> {
    while (this.sendPromise !== undefined) {
      await this.sendPromise
    }
    this.sendPromise = this.router.send(msg)
    try {
      await this.sendPromise
    } catch (err: any) {
      console.error('Failed to send message', err)
    }
    this.sendPromise = undefined
  }

  stats: {
    pings: number
    requests: number
    responses: number
    hellos: number
  } = {
      pings: 0,
      requests: 0,
      responses: 0,
      hellos: 0
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
            this.stats.hellos++
            // Remember clientId to be able to do back requests.
            const needHello = !this.clientMapping.has(reqId.toString() as ClientT)
            this.clientMapping.set(reqId.toString() as ClientT, clientId)

            // Parse the timeout from the hello message
            let clientAliveTimeout = timeouts.aliveTimeout
            try {
              const helloData = JSON.parse(payload.toString())
              if (helloData.aliveTimeout !== undefined) {
                clientAliveTimeout = helloData.aliveTimeout
              }
            } catch (err) {
              // If parsing fails, use default timeout
            }

            const clientInfo: RPCClientInfo<ClientT> =
              this.revClientMapping.get(clientIdText) ??
              ({
                id: reqId.toString() as ClientT,
                lastSeen: this.tickMgr.now(),
                requests: new Set(),
                requestsTime: 0,
                requestsTotal: 0,
                helloCounter: 0,
                aliveTimeout: clientAliveTimeout
              } satisfies RPCClientInfo<ClientT>)
            clientInfo.helloCounter++
            clientInfo.aliveTimeout = clientAliveTimeout // Update timeout on reconnection

            this.revClientMapping.set(clientIdText, clientInfo)
            void this.doSend([clientId, backrpcOperations.hello, this.uuid, ''])
            if (needHello) {
              void this.handlers.helloHandler?.(reqId.toString() as ClientT).catch((err) => {
                console.error('Error in helloHandler', err)
              })
            }
            break
          }
          case backrpcOperations.close: {
            if (client !== undefined) {
              this.handleClose(client.id, clientIdText, false)
            }
            break
          }
          case backrpcOperations.ping: {
            this.stats.pings++
            void this.doSend([clientId, backrpcOperations.pong, this.uuid, ''])
            if (client !== undefined) {
              this.handlers.onPing?.(client?.id)
            } else {
              // Ping from undefined client mean, we remove it because of inactivity, so we could ask for hello.
              void this.doSend([clientId, backrpcOperations.askHello, this.uuid, ''])
            }
            break
          }
          case backrpcOperations.request:
            {
              this.stats.requests++
              if (client === undefined) {
                // No Client, requests are not possible
                void this.doSend([clientId, backrpcOperations.retry, reqId, JSON.stringify(1)])
                continue
              }
              if (client.requests.has(reqId)) {
                // We already had this request, so continue waiting for response.
                continue
              }
              if (client.requests.size > this.requestsLimit) {
                // No Client, requests are not possible
                void this.doSend([clientId, backrpcOperations.retry, reqId, JSON.stringify(client.requests.size)])
                continue
              }

              client.requestsTotal++

              const [method, params] = JSON.parse(payload.toString())

              const sendError = async (err: Error): Promise<void> => {
                void this.doSend([
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
                  void this.doSend([clientId, backrpcOperations.response, reqId, JSON.stringify(response)])
                })
                .catch((err) => {
                  void sendError(err)
                })
            }
            break
          case backrpcOperations.response: {
            this.stats.responses++
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
            this.stats.responses++
            const reqID = reqId.toString()
            const req = this.backRequests.get(reqID)
            try {
              const { message, stack } = JSON.parse(payload.toString())
              req?.reject(new Error(message + '\n' + stack))
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

      void this.doSend([clientIdentity, backrpcOperations.request, reqId, JSON.stringify([method, params])]).catch(
        (err) => {
          reject(err)
        }
      )
    })
  }

  async send (clientId: ClientT, body: any): Promise<any> {
    const clientIdentity = this.clientMapping.get(clientId)
    if (clientIdentity === undefined) {
      throw new Error(`Client ${clientId as string} not found`)
    }
    await this.doSend([clientIdentity, backrpcOperations.event, '', JSON.stringify(body)])
  }

  async close (): Promise<void> {
    this.closed = true
    this.stopTick?.()
    this.router.close()
  }
}
