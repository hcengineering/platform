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
import * as zmq from 'zeromq'
import { backrpcOperations, type ClientId } from './types'
import { context } from './context'
import { parseJSON, stringifyJSON } from './json-utils'

export type BackRPCResponseSend = (response: any) => Promise<void>
export interface BackRPCClientHandler {
  requestHandler: (method: string, params: any, send: BackRPCResponseSend) => Promise<void>
  onRegister?: () => Promise<void>
  onEvent?: (event: any) => Promise<void>
}

interface RequestInfo {
  resolve: (data: any) => void
  reject: (err: any) => void
  method: string
  params: any
}

export class BackRPCClient<ClientT extends string = ClientId> {
  serverId: string | Promise<string>
  dealer: zmq.Dealer

  requestCounter: number = 0

  requests = new Map<string, RequestInfo>()

  closed: boolean = false

  observer: zmq.Observer

  setServerId: (serverId: string) => void

  stopTick?: () => void

  lastPong: number = 0

  aliveTimeout: number

  constructor (
    readonly clientId: ClientT,
    readonly client: BackRPCClientHandler,
    readonly host: string,
    readonly port: number,
    readonly tickMgr: TickManager,
    options?: zmq.SocketOptions<zmq.Dealer>,
    aliveTimeout?: number
  ) {
    this.aliveTimeout = aliveTimeout ?? timeouts.aliveTimeout
    this.dealer = new zmq.Dealer({ ...options, context })

    this.setServerId = () => {}
    this.serverId = new Promise<string>((resolve) => {
      this.setServerId = (serverId) => {
        this.serverId = serverId
        resolve(serverId)
      }
    })

    this.observer = new zmq.Observer(this.dealer)

    this.observer.on('connect', (data) => {
      console.log('Connected to server', data)
      void this.sendHello().catch((err) => {
        console.error('Failed to send hello', err)
      })
    })
    this.dealer.connect(`tcp://${host}:${port}`)
    void this.start().catch((err) => {
      console.error('Failed to start BackRPCClient', err)
    })

    this.stopTick = this.tickMgr.register(async () => {
      await this.checkAlive()
    }, timeouts.pingInterval)
  }

  private sendPromise: Promise<void> | undefined

  async doSend (msg: any[]): Promise<void> {
    while (this.sendPromise !== undefined) {
      await this.sendPromise
    }
    this.sendPromise = this.dealer.send(msg)
    try {
      await this.sendPromise
    } catch (err: any) {
      console.error('Failed to send message', err)
    }
    this.sendPromise = undefined
  }

  async checkAlive (): Promise<void> {
    await this.doSend([backrpcOperations.ping, '', '', ''])
  }

  private async sendHello (): Promise<void> {
    await this.doSend([
      backrpcOperations.hello,
      this.clientId as string,
      stringifyJSON({ aliveTimeout: this.aliveTimeout }),
      ''
    ])
  }

  private async start (): Promise<void> {
    // Read messages from clients.
    for await (const msg of this.dealer) {
      if (this.closed) {
        return
      }
      try {
        const [operation, reqId, payload] = [parseInt(msg[0].toString()), msg[1].toString(), msg[2]]
        switch (operation) {
          case backrpcOperations.hello: {
            const serverUuid = reqId.toString()
            if (this.serverId !== serverUuid) {
              this.setServerId(serverUuid)

              void this.client.onRegister?.()?.catch((err) => {
                console.error('Failed to register client', err)
              })

              // We need to resend all pending requests.
              void this.resendRequests()
            }
            break
          }
          case backrpcOperations.request:
            {
              const [method, params] = parseJSON(payload.toString())
              void this.client
                .requestHandler(method, params, async (response: any) => {
                  await this.doSend([backrpcOperations.response, reqId, stringifyJSON(response)])
                })
                .catch((error) => {
                  void this.doSend([
                    backrpcOperations.responseError,
                    reqId,
                    stringifyJSON({
                      message: error.message ?? '',
                      stack: error.stack ?? ''
                    })
                  ]).catch((err2) => {
                    console.error('Failed to send error', err2, err2)
                  })
                })
            }
            break
          case backrpcOperations.response: {
            const req = this.requests.get(reqId)
            try {
              req?.resolve(parseJSON(payload.toString()))
            } catch (err: any) {
              console.error(err)
            }
            this.requests.delete(reqId)
            break
          }
          case backrpcOperations.responseError: {
            const req = this.requests.get(reqId)
            try {
              const { message, stack } = parseJSON(payload.toString())
              req?.reject(new Error(message + '\n' + stack))
            } catch (err: any) {
              console.error(err)
            }
            this.requests.delete(reqId)
            break
          }
          case backrpcOperations.event: {
            void this.client.onEvent?.(parseJSON(payload.toString())).catch((err) => {
              console.error('Failed to handle event', err)
            })
            break
          }
          case backrpcOperations.retry: {
            const req = this.requests.get(reqId)
            if (req !== undefined) {
              const count = parseJSON(payload.toString())
              void this.tickMgr.waitTick(count).then(() => {
                void this.doSend([backrpcOperations.request, reqId, stringifyJSON([req.method, req.params])]).catch(
                  (err) => {
                    console.error('Failed to resend request', err)
                  }
                )
              })
            }
            break
          }
          case backrpcOperations.pong: {
            // Server it all fine
            this.lastPong = this.tickMgr.now()
            break
          }
          case backrpcOperations.askHello: {
            // Server ask us to re-hello, probably because it has restarted
            this.setServerId('') // Clear server id for re-register to be performed
            await this.sendHello()
            break
          }
        }
      } catch (err: any) {
        console.error(err)
      }
    }
  }

  private async resendRequests (): Promise<void> {
    if (this.closed) {
      console.error('Client is closed, cannot resend requests')
      return
    }
    for (const [reqId, req] of Array.from(this.requests.entries())) {
      try {
        await this.doSend([backrpcOperations.request, reqId, stringifyJSON([req.method, req.params])])
      } catch (err: any) {
        console.error('Failed to resend request', err)
      }
    }
  }

  async waitConnection (): Promise<void> {
    if (this.serverId instanceof Promise) {
      await this.serverId
    }
  }

  rCount = 0

  async request<T>(method: string, params: any): Promise<T> {
    if (this.serverId instanceof Promise) {
      await this.serverId
    }
    return await new Promise<T>((resolve, reject) => {
      const reqId = this.clientId + '-' + this.requestCounter++
      this.requests.set(reqId, { resolve, reject, method, params })

      void this.doSend([backrpcOperations.request, reqId, stringifyJSON([method, params])]).catch((err) => {
        this.requests.delete(reqId) // Cleanup on failure
        reject(err)
      })
    })
  }

  async send (body: any): Promise<any> {
    await this.doSend([backrpcOperations.event, '', stringifyJSON(body), ''])
  }

  close (): void {
    if (this.closed) {
      return
    }
    this.closed = true

    // We need to reject all pending requests
    if (this.requests.size > 0) {
      for (const [reqId, req] of Array.from(this.requests.entries())) {
        req.reject(new Error('Client closed'))
        this.requests.delete(reqId)
      }
    }

    this.stopTick?.()

    // Try to send close message, but don't wait for it
    void this.doSend([backrpcOperations.close, '', '', '']).catch((err) => {
      console.error('Failed to send close', err)
    })

    this.dealer.close()
  }
}
