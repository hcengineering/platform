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

  constructor (
    readonly clientId: ClientT,
    readonly client: BackRPCClientHandler,
    readonly host: string,
    readonly port: number,
    readonly tickMgr: TickManager,
    options?: zmq.SocketOptions<zmq.Dealer>
  ) {
    this.dealer = new zmq.Dealer(options)
    this.dealer.connect(`tcp://${host}:${port}`)

    this.setServerId = () => {}
    this.serverId = new Promise<string>((resolve) => {
      this.setServerId = (serverId) => {
        this.serverId = serverId
        resolve(serverId)
      }
    })

    this.observer = new zmq.Observer(this.dealer)
    this.observer.on('connect', (data) => {
      void this.sendHello()
    })
    void this.start()

    this.stopTick = this.tickMgr.register(() => {
      void this.checkAlive()
    }, timeouts.pingInterval)
  }

  async checkAlive (): Promise<void> {
    await this.dealer.send([backrpcOperations.ping, this.clientId as string, '', ''])
  }

  private async sendHello (): Promise<void> {
    await this.dealer.send([backrpcOperations.hello, this.clientId as string, '', ''])
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
              const [method, params] = JSON.parse(payload.toString())
              void this.client
                .requestHandler(method, params, async (response: any) => {
                  await this.dealer.send([backrpcOperations.response, reqId, JSON.stringify(response)])
                })
                .catch((error) => {
                  void this.dealer
                    .send([
                      backrpcOperations.responseError,
                      reqId,
                      JSON.stringify({
                        message: error.message ?? '',
                        stack: error.stack ?? ''
                      })
                    ])
                    .catch((err2) => {
                      console.error('Failed to send error', err2, err2)
                    })
                })
            }
            break
          case backrpcOperations.response: {
            const req = this.requests.get(reqId)
            try {
              req?.resolve(JSON.parse(payload.toString()))
            } catch (err: any) {
              console.error(err)
            }
            this.requests.delete(reqId)
            break
          }
          case backrpcOperations.responseError: {
            const req = this.requests.get(reqId)
            try {
              req?.reject(JSON.parse(payload.toString()))
            } catch (err: any) {
              console.error(err)
            }
            this.requests.delete(reqId)
            break
          }
          case backrpcOperations.event: {
            void this.client.onEvent?.(JSON.parse(payload.toString())).catch((err) => {
              console.error('Failed to handle event', err)
            })
            break
          }
          case backrpcOperations.retry: {
            const req = this.requests.get(reqId)
            if (req !== undefined) {
              const count = JSON.parse(payload.toString())
              void this.tickMgr.waitTick(count).then(() => {
                void this.dealer
                  .send([backrpcOperations.request, reqId, JSON.stringify([req.method, req.params])])
                  .catch((err) => {
                    console.error('Failed to resend request', err)
                  })
              })
            }
          }
        }
      } catch (err: any) {
        console.error(err)
      }
    }
  }

  private async resendRequests (): Promise<void> {
    for (const [reqId, req] of Array.from(this.requests.entries())) {
      try {
        await this.dealer.send([backrpcOperations.request, reqId, JSON.stringify([req.method, req.params])])
      } catch (err: any) {
        console.error('Failed to resend request', err)
      }
    }
  }

  async request<T>(method: string, params: any): Promise<T> {
    if (this.serverId instanceof Promise) {
      await this.serverId
    }
    return await new Promise<T>((resolve, reject) => {
      const reqId = this.clientId + '-' + this.requestCounter++
      this.requests.set(reqId, { resolve, reject, method, params })

      void this.dealer.send([backrpcOperations.request, reqId, JSON.stringify([method, params])]).catch((err) => {
        this.requests.delete(reqId) // Cleanup on failure
        reject(err)
      })
    })
  }

  async send (body: any): Promise<any> {
    await this.dealer.send([backrpcOperations.event, body])
  }

  close (): void {
    this.closed = true
    this.stopTick?.()
    this.dealer.close()
  }
}
