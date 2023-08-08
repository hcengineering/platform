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

import contact from '@hcengineering/contact'
import core, {
  Account,
  BackupClient,
  ClassifierKind,
  Client,
  DOMAIN_TX,
  Doc,
  DocumentUpdate,
  MeasureMetricsContext,
  Ref,
  TxOperations,
  WorkspaceId,
  generateId,
  metricsToString,
  newMetrics,
  systemAccountEmail
} from '@hcengineering/core'
import { generateToken } from '@hcengineering/server-token'
import { connect } from '@hcengineering/server-tool'

import client from '@hcengineering/client'
import { setMetadata } from '@hcengineering/platform'
import os from 'os'
import { Worker, isMainThread, parentPort } from 'worker_threads'
import { CSVWriter } from './csv'

interface StartMessage {
  workspaceId: WorkspaceId
  transactorUrl: string
  id: number
  idd: number
  workId: string
  options: {
    readRequests: number
    modelRequests: number
    limit: {
      min: number
      rand: number
    }
    // If enabled, will perform write tx for same values and Derived format.
    write: boolean
    sleep: number
  }
  binary: boolean
  compression: boolean
}
interface Msg {
  type: 'complete' | 'operate'
}

interface CompleteMsg extends Msg {
  type: 'complete'
  workId: string
}

// interface OperatingMsg extends Msg {
//   type: 'operate'
//   workId: string
// }

const benchAccount = (core.account.System + '_benchmark') as Ref<Account>

export async function benchmark (
  workspaceId: WorkspaceId[],
  transactorUrl: string,
  cmd: { from: number, steps: number, sleep: number, binary: boolean, write: boolean, compression: boolean }
): Promise<void> {
  let operating = 0
  const workers: Worker[] = []

  const works = new Map<string, () => void>()

  setMetadata(client.metadata.UseBinaryProtocol, cmd.binary)
  setMetadata(client.metadata.UseProtocolCompression, cmd.compression)

  os.cpus().forEach(() => {
    /* Spawn a new thread running this source file */
    const worker = new Worker(__filename)
    workers.push(worker)
    worker.on('message', (data: Msg) => {
      if (data === undefined) {
        return
      }
      if (data.type === 'operate') {
        operating += 1
      }
      if (data.type === 'complete') {
        const resolve = works.get((data as CompleteMsg).workId)
        if (resolve != null) {
          resolve()
          operating -= 1
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
  let transfer: number = 0

  const token = generateToken(systemAccountEmail, workspaceId[0])

  const monitorConnection = isMainThread
    ? ((await ctx.with(
        'connect',
        {},
        async () => await connect(transactorUrl, workspaceId[0], undefined, { mode: 'backup' })
      )) as BackupClient & Client)
    : undefined

  if (monitorConnection !== undefined) {
    // We need to cleanup all transactions from our benchmark account.
    const txes = await monitorConnection.findAll(
      core.class.Tx,
      { modifiedBy: benchAccount },
      { projection: { _id: 1 } }
    )
    await monitorConnection.clean(DOMAIN_TX, Array.from(txes.map((it) => it._id)))
  }

  let running = false

  let timer: any
  if (isMainThread) {
    timer = setInterval(() => {
      const st = Date.now()

      try {
        void fetch(transactorUrl.replace('ws:/', 'http:/') + '/' + token)
          .then((res) => {
            void res
              .json()
              .then((json) => {
                memUsed = json.statistics.memoryUsed
                memTotal = json.statistics.memoryTotal
                cpu = json.statistics.cpuUsage
                const r =
                  json.metrics?.measurements?.client?.measurements?.handleRequest?.measurements?.call?.measurements?.[
                    'find-all'
                  ]
                operations = r?.operations ?? 0
                requestTime = (r?.value ?? 0) / (((r?.operations as number) ?? 0) + 1)
                transfer =
                  json.metrics?.measurements?.client?.measurements?.handleRequest?.measurements?.['#send-data']
                    ?.value ?? 0
              })
              .catch((err) => console.log(err))
          })
          .catch((err) => console.log(err))
      } catch (err) {
        console.log(err)
      }

      if (!running) {
        running = true
        void ctx.with(
          'avg',
          {},
          async () =>
            await monitorConnection?.findAll(contact.mixin.Employee, {}).then((res) => {
              const cur = Date.now() - st
              opTime += cur
              moment = cur
              ops++
              running = false
            })
        )
      }
      elapsed++
      csvWriter.add(
        {
          time: elapsed,
          clients: operating,
          moment,
          average: Math.round(opTime / (ops + 1)),
          mem: memUsed,
          memTotal,
          cpu,
          requestTime,
          operations: Math.round(operations / (elapsed + 1)),
          transfer: Math.round(transfer / (elapsed + 1)) / 1024
        },
        true
      )
      void csvWriter.write(`report${cmd.binary ? '-bin' : ''}${cmd.write ? '-wr' : ''}.csv`)
    }, 1000)
  }
  for (let i = cmd.from; i < cmd.from + cmd.steps; i++) {
    await ctx.with('iteration', { i }, async () => {
      await Promise.all(
        Array.from(Array(i))
          .map((it, idx) => idx)
          .map((it) => {
            const wsid = workspaceId[randNum(workspaceId.length)]
            const workId = generateId()
            const msg: StartMessage = {
              workspaceId: wsid,
              transactorUrl,
              id: i,
              idd: it,
              workId,
              options: {
                readRequests: 100,
                modelRequests: 0,
                limit: {
                  min: 10,
                  rand: 1000
                },
                sleep: cmd.sleep,
                write: cmd.write
              },
              binary: cmd.binary,
              compression: cmd.compression
            }
            workers[i % workers.length].postMessage(msg)

            return new Promise((resolve) => {
              works.set(workId, () => resolve(null))
            })
          })
      )
    })
    console.log(metricsToString(m, `iteration-${i}`, 120))
  }

  if (isMainThread) {
    for (const w of workers) {
      await w.terminate()
    }
    clearInterval(timer)
    await monitorConnection?.close()
  }
}

function randNum (value = 2): number {
  return Math.round(Math.random() * value) % value
}

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

    connection = await connect(msg.transactorUrl, msg.workspaceId, undefined)
    const opt = new TxOperations(connection, (core.account.System + '_benchmark') as Ref<Account>)
    parentPort?.postMessage({
      type: 'operate',
      workId: msg.workId
    })

    const h = connection.getHierarchy()
    const allClasses = await connection.getModel().findAll(core.class.Class, {})
    const classes = allClasses.filter((it) => it.kind === ClassifierKind.CLASS && h.findDomain(it._id) !== undefined)
    while (msg.options.readRequests + msg.options.modelRequests > 0) {
      if (msg.options.modelRequests > 0) {
        await connection?.findAll(core.class.Tx, {}, { sort: { _id: -1 } })
        msg.options.modelRequests--
      }
      let doc: Doc | undefined
      if (msg.options.readRequests > 0) {
        const cl = classes[randNum(classes.length - 1)]
        if (cl !== undefined) {
          const docs = await connection?.findAll(
            cl._id,
            {},
            {
              sort: { _id: -1 },
              limit: msg.options.limit.min + randNum(msg.options.limit.rand)
            }
          )
          if (docs.length > 0) {
            doc = docs[randNum(docs.length - 1)]
          }
          msg.options.readRequests--
        }
        if (msg.options.write && doc !== undefined) {
          const attrs = connection.getHierarchy().getAllAttributes(doc._class)
          const upd: DocumentUpdate<Doc> = {}
          for (const [key, value] of attrs.entries()) {
            if (value.type._class === core.class.TypeString || value.type._class === core.class.TypeBoolean) {
              if (
                key !== '_id' &&
                key !== '_class' &&
                key !== 'space' &&
                key !== 'attachedTo' &&
                key !== 'attachedToClass'
              ) {
                const v = (doc as any)[key]
                if (v != null) {
                  ;(upd as any)[key] = v
                }
              }
            }
          }
          if (Object.keys(upd).length > 0) {
            await opt.update(doc, upd)
          }
        }
      }
      if (msg.options.sleep > 0) {
        await new Promise((resolve) => setTimeout(resolve, randNum(msg.options.sleep)))
      }
    }
    //
    // console.log(`${msg.idd} perform complete`)
  } catch (err: any) {
    console.error(msg.workspaceId, err)
  } finally {
    await connection?.close()
  }
  parentPort?.postMessage({
    type: 'complete',
    workId: msg.workId
  })
}
