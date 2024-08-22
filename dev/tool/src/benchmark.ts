//
// Copyright © 2023 Hardcore Engineering Inc.
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

import core, {
  MeasureMetricsContext,
  RateLimiter,
  TxOperations,
  concatLink,
  generateId,
  metricsToString,
  newMetrics,
  systemAccountEmail,
  type Account,
  type BackupClient,
  type BenchmarkDoc,
  type Client,
  type Metrics,
  type Ref,
  type WorkspaceId
} from '@hcengineering/core'
import { generateToken } from '@hcengineering/server-token'
import { connect } from '@hcengineering/server-tool'

import client from '@hcengineering/client'
import { setMetadata } from '@hcengineering/platform'
import serverClientPlugin, { getTransactorEndpoint } from '@hcengineering/server-client'
import os from 'os'
import { Worker, isMainThread, parentPort } from 'worker_threads'
import { CSVWriter } from './csv'

import { WebSocket } from 'ws'

interface StartMessage {
  email: string
  workspaceId: WorkspaceId
  transactorUrl: string
  id: number
  idd: number
  workId: string
  options: {
    smallRequests: number
    rate: number
    bigRequests: number
    limit: {
      min: number
      rand: number
    }
    // If enabled, will perform write tx for same values and Derived format.
    write: boolean
    sleep: number
    mode: 'find-all' | 'connect-only'
  }
  binary: boolean
  compression: boolean
}
interface Msg {
  type: 'complete' | 'operate' | 'pending'
}

interface CompleteMsg extends Msg {
  type: 'complete'
  workId: string
}

interface PendingMsg extends Msg {
  type: 'pending'
  workId: string
  pending: number
}

export async function benchmark (
  workspaceId: WorkspaceId[],
  users: Map<string, string[]>,
  accountsUrl: string,
  cmd: {
    from: number
    steps: number
    sleep: number
    binary: boolean
    write: boolean
    compression: boolean
    mode: 'find-all' | 'connect-only'
  }
): Promise<void> {
  const operating = new Set<string>()
  const workers: Worker[] = []

  const works = new Map<string, () => void>()

  setMetadata(client.metadata.UseBinaryProtocol, cmd.binary)
  setMetadata(client.metadata.UseProtocolCompression, cmd.compression)

  os.cpus().forEach(() => {
    /* Spawn a new thread running this source file */
    const worker = new Worker(__filename, {
      argv: ['benchmarkWorker']
    })
    workers.push(worker)
    worker.on('message', (data: Msg) => {
      if (data === undefined) {
        return
      }
      if (data.type === 'operate') {
        operating.add((data as any).workId)
      }
      if (data.type === 'pending') {
        const msg = data as PendingMsg
        console.log('info', `worker:${msg.workId}`, msg.pending)
      }
      if (data.type === 'complete') {
        const resolve = works.get((data as CompleteMsg).workId)
        if (resolve != null) {
          resolve()
          operating.delete((data as any).workId)
        } else {
          console.log('Worker failed to done', (data as CompleteMsg).workId)
        }
      }
    })
  })

  const m = newMetrics()
  const ctx = new MeasureMetricsContext('benchmark', {}, m)

  const csvWriter = new CSVWriter<{
    time: number
    clients: number
    average: number
    moment: number
    mem: number
    memTotal: number
    cpu: number
    requestTime: number
    operations: number
    transfer: number
  }>({
    time: 'Time',
    clients: 'Clients',
    average: 'Average',
    moment: 'Moment Time',
    mem: 'Mem',
    memTotal: 'Mem total',
    cpu: 'CPU',
    requestTime: 'Request time',
    operations: 'OPS',
    transfer: 'Transfer(kb)'
  })

  let opTime: number = 0
  let moment: number = 0
  let ops = 0
  let cpu: number = 0
  let memUsed: number = 0
  let memTotal: number = 0
  let elapsed = 0
  let requestTime: number = 0
  let operations = 0
  let oldOperations = 0
  let transfer: number = 0
  let oldTransfer: number = 0

  const token = generateToken(systemAccountEmail, workspaceId[0])

  setMetadata(serverClientPlugin.metadata.Endpoint, accountsUrl)
  const endpoint = await getTransactorEndpoint(token, 'external')
  console.log('monitor endpoint', endpoint, 'workspace', workspaceId[0].name)
  const monitorConnection = isMainThread
    ? ((await ctx.with(
        'connect',
        {},
        async () => await connect(endpoint, workspaceId[0], undefined, { mode: 'backup' })
      )) as BackupClient & Client)
    : undefined

  let running = false

  function extract (metrics: Metrics, ...path: string[]): Metrics | null {
    let m = metrics
    for (const p of path) {
      let found = false
      for (const [k, v] of Object.entries(m.measurements)) {
        if (k.includes(p)) {
          m = v
          found = true
          break
        }
      }
      if (!found) {
        return null
      }
    }
    return m
  }

  let timer: any
  if (isMainThread && monitorConnection !== undefined) {
    timer = setInterval(() => {
      const st = Date.now()

      try {
        const fetchUrl = endpoint.replace('ws:/', 'http:/') + '/api/v1/statistics?token=' + token
        void fetch(fetchUrl)
          .then((res) => {
            void res
              .json()
              .then((json) => {
                memUsed = json.statistics.memoryUsed
                memTotal = json.statistics.memoryTotal
                cpu = json.statistics.cpuUsage
                // operations = 0
                requestTime = 0
                // transfer = 0
                const r = extract(
                  json.metrics as Metrics,
                  '🧲 session',
                  'client',
                  'handleRequest',
                  'process',
                  'find-all'
                )
                operations = (r?.operations ?? 0) - oldOperations
                oldOperations = r?.operations ?? 0

                requestTime = (r?.value ?? 0) / (((r?.operations as number) ?? 0) + 1)

                const tr = extract(json.metrics as Metrics, '🧲 session', '#send-data')
                transfer = (tr?.value ?? 0) - oldTransfer
                oldTransfer = tr?.value ?? 0
              })
              .catch((err) => {
                console.log(err)
              })
          })
          .catch((err) => {
            console.log(err)
          })
      } catch (err) {
        console.log(err)
      }

      if (!running) {
        running = true
        void ctx.with('avg', {}, async () => {
          await monitorConnection
            ?.findAll(core.class.BenchmarkDoc, {
              source: 'monitor',
              request: {
                documents: 1,
                size: 1
              }
            })
            .then((res) => {
              const cur = Date.now() - st
              opTime += cur
              moment = cur
              ops++
              running = false
            })
        })
      }
      elapsed++
      // console.log('Sheduled', scheduled)
      csvWriter.add(
        {
          time: elapsed,
          clients: operating.size,
          moment,
          average: Math.round(opTime / (ops + 1)),
          mem: memUsed,
          memTotal,
          cpu,
          requestTime,
          operations,
          transfer: transfer / 1024
        },
        true
      )
    }, 1000)

    for (let i = cmd.from; i < cmd.from + cmd.steps; i++) {
      await ctx.with('iteration', { i }, async () => {
        await Promise.all(
          Array.from(Array(i))
            .map((it, idx) => idx)
            .map(async (it) => {
              const wsid = workspaceId[randNum(workspaceId.length)]
              const workId = 'w-' + i + '-' + it
              const wsUsers = users.get(wsid.name) ?? []

              const token = generateToken(systemAccountEmail, wsid)
              const endpoint = await getTransactorEndpoint(token, 'external')
              console.log('endpoint', endpoint, 'workspace', wsid.name)
              const msg: StartMessage = {
                email: wsUsers[randNum(wsUsers.length)],
                workspaceId: wsid,
                transactorUrl: endpoint,
                id: i,
                idd: it,
                workId,
                options: {
                  smallRequests: 100,
                  rate: 1,
                  bigRequests: 0,
                  limit: {
                    min: 64,
                    rand: 512
                  },
                  sleep: cmd.sleep,
                  write: cmd.write,
                  mode: cmd.mode
                },
                binary: cmd.binary,
                compression: cmd.compression
              }
              workers[i % workers.length].postMessage(msg)

              return await new Promise((resolve) => {
                works.set(workId, () => {
                  resolve(null)
                })
              })
            })
        )
      })
      console.log(metricsToString(m, `iteration-${i}`, 120))
    }

    for (const w of workers) {
      await w.terminate()
    }
    clearInterval(timer)
    await csvWriter.write(`report${cmd.binary ? '-bin' : ''}${cmd.write ? '-wr' : ''}.csv`)
    await monitorConnection?.close()
  }
}

function randNum (value = 2): number {
  return Math.round(Math.random() * value) % value
}

export function benchmarkWorker (): void {
  if (!isMainThread) {
    parentPort?.on('message', (msg: StartMessage) => {
      console.log('starting worker', msg.workId)
      void perform(msg)
    })
  }

  async function perform (msg: StartMessage): Promise<void> {
    let connection: Client | undefined
    try {
      setMetadata(client.metadata.UseBinaryProtocol, msg.binary)
      setMetadata(client.metadata.UseProtocolCompression, msg.compression)
      console.log('connecting to', msg.workspaceId)

      connection = await connect(msg.transactorUrl, msg.workspaceId, msg.email)

      if (msg.options.mode === 'find-all') {
        const opt = new TxOperations(connection, (core.account.System + '_benchmark') as Ref<Account>)
        parentPort?.postMessage({
          type: 'operate',
          workId: msg.workId
        })

        const rateLimiter = new RateLimiter(msg.options.rate)

        let bigRunning = 0

        while (msg.options.smallRequests + msg.options.bigRequests > 0) {
          const variant = Math.random()
          // console.log(`Thread ${msg.workId} ${msg.options.smallRequests} ${msg.options.bigRequests}`)
          if (msg.options.bigRequests > 0 && variant < 0.5 && bigRunning === 0) {
            await rateLimiter.add(async () => {
              bigRunning = 1
              await connection?.findAll(core.class.BenchmarkDoc, {
                source: msg.workId,
                request: {
                  documents: {
                    from: 1024,
                    to: 1000
                  },
                  size: {
                    // 1kb to 5kb
                    from: 1 * 1024,
                    to: 4 * 1024
                  }
                }
              })
            })
            bigRunning = 0
            msg.options.bigRequests--
          }
          if (msg.options.smallRequests > 0 && variant > 0.5) {
            await rateLimiter.add(async () => {
              await connection?.findAll(core.class.BenchmarkDoc, {
                source: msg.workId,
                request: {
                  documents: {
                    from: msg.options.limit.min,
                    to: msg.options.limit.min + msg.options.limit.rand
                  },
                  size: {
                    from: 4,
                    to: 16
                  }
                }
              })
            })
            msg.options.smallRequests--
          }
          if (msg.options.write) {
            await opt.updateDoc(core.class.BenchmarkDoc, core.space.DerivedTx, '' as Ref<BenchmarkDoc>, {
              response: 'qwe'
            })
          }
          if (msg.options.sleep > 0) {
            await new Promise((resolve) => setTimeout(resolve, randNum(msg.options.sleep)))
          }
        }

        // clearInterval(infoInterval)
        await rateLimiter.waitProcessing()
        const to1 = setTimeout(() => {
          parentPort?.postMessage({
            type: 'log',
            workId: msg.workId,
            msg: `timeout waiting processing${msg.workId}`
          })
        }, 5000)
        clearTimeout(to1)
        //
        // console.log(`${msg.idd} perform complete`)
      } else if (msg.options.mode === 'connect-only') {
        parentPort?.postMessage({
          type: 'operate',
          workId: msg.workId
        })
        // Just a huge timeout
        await new Promise<void>((resolve) => setTimeout(resolve, 50000000))
      }
    } catch (err: any) {
      console.error(msg.workspaceId, err)
    } finally {
      const to = setTimeout(() => {
        parentPort?.postMessage({
          type: 'log',
          workId: msg.workId,
          msg: `timeout closing connection${msg.workId}`
        })
      }, 5000)
      await connection?.close()
      clearTimeout(to)
    }

    parentPort?.postMessage({
      type: 'complete',
      workId: msg.workId
    })
  }
}

export type StressBenchmarkMode = 'wrong' | 'connect-disconnect'
export async function stressBenchmark (transactor: string, mode: StressBenchmarkMode): Promise<void> {
  if (mode === 'wrong') {
    console.log('Stress with wrong workspace/email')
    let counter = 0
    const rate = new RateLimiter(1)
    while (true) {
      try {
        counter++
        console.log('Attempt', counter)
        const token = generateToken(generateId(), { name: generateId() })
        await rate.add(async () => {
          try {
            const ws = new WebSocket(concatLink(transactor, token))
            await new Promise<void>((resolve) => {
              ws.onopen = () => {
                resolve()
              }
            })
            // ws.close()
            // await createClient(transactor, token, undefined, 50)
            console.log('out')
          } catch (err: any) {
            console.error(err)
          }
        })
      } catch (err: any) {
        // Ignore
      }
    }
  }
}
