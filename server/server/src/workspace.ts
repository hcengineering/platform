//
// Copyright © 2022, 2023 Hardcore Engineering Inc.
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

import { Analytics } from '@hcengineering/analytics'
import { type ServerApi as CommunicationApi } from '@hcengineering/communication-sdk-types'
import { systemAccountUuid, type Branding, type MeasureContext, type WorkspaceIds } from '@hcengineering/core'
import type { Pipeline } from '@hcengineering/server-core'
import type { Session } from './types'

export interface PipelinePair {
  pipeline: Pipeline
  communicationApi: CommunicationApi
}
export type WorkspacePipelineFactory = () => Promise<PipelinePair>

export interface Workspace {
  sessions: Map<string, Session>

  operations: number

  maintenance: boolean

  lastTx: string | undefined // TODO: Do not cache for proxy case
  lastHash: string | undefined // TODO: Do not cache for proxy case

  context: MeasureContext
  token: string // Account workspace update token.

  tickHash: number

  softShutdown: number

  wsId: WorkspaceIds
  branding: Branding | null

  open: () => void

  getLastTx: () => string | undefined

  getLastHash: () => string | undefined

  with: <T>(op: (pipeline: Pipeline, communicationApi: CommunicationApi) => Promise<T>) => Promise<T>

  close: (ctx: MeasureContext) => Promise<void>

  addSession: (session: Session) => Promise<void>
  removeSession: (session: Session) => Promise<void>

  checkHasUser: () => boolean
}
/**
 * @public
 */
export class WorkspaceImpl implements Workspace {
  pipeline?: PipelinePair | Promise<PipelinePair>

  softShutdown: number

  sessions = new Map<string, Session>()

  operations: number = 0

  maintenance: boolean = false

  lastTx: string | undefined // TODO: Do not cache for proxy case
  lastHash: string | undefined // TODO: Do not cache for proxy case

  constructor (
    readonly context: MeasureContext,
    readonly token: string, // Account workspace update token.
    readonly factory: WorkspacePipelineFactory,

    readonly tickHash: number,

    softShutdown: number,

    readonly wsId: WorkspaceIds,
    readonly branding: Branding | null
  ) {
    this.softShutdown = softShutdown
  }

  open (): void {
    const pair = this.getPipelinePair()
    if (pair instanceof Promise) {
      void pair.then((it) => {
        this.lastHash = it.pipeline.context.lastHash
        this.lastTx = it.pipeline.context.lastTx
      })
    }
  }

  getLastTx (): string | undefined {
    return this.lastTx
  }

  getLastHash (): string | undefined {
    return this.lastHash
  }

  private getPipelinePair (): PipelinePair | Promise<PipelinePair> {
    if (this.pipeline === undefined) {
      this.pipeline = this.factory()
    }
    return this.pipeline
  }

  async with<T>(op: (pipeline: Pipeline, communicationApi: CommunicationApi) => Promise<T>): Promise<T> {
    this.operations++
    let pair = this.getPipelinePair()
    if (pair instanceof Promise) {
      pair = await pair
      this.pipeline = pair
    }
    try {
      const result = await op(pair.pipeline, pair.communicationApi)
      this.lastHash = pair.pipeline.context.lastHash
      this.lastTx = pair.pipeline.context.lastTx
      return result
    } finally {
      this.operations--
    }
  }

  async close (ctx: MeasureContext): Promise<void> {
    if (this.pipeline === undefined) {
      return
    }
    const { pipeline, communicationApi } = await this.pipeline
    const closePipeline = async (): Promise<void> => {
      try {
        await ctx.with('close-pipeline', {}, async () => {
          await pipeline.close()
        })
      } catch (err: any) {
        Analytics.handleError(err)
        ctx.error('close-pipeline-error', { error: err })
      }
    }

    const closeCommunicationApi = async (): Promise<void> => {
      try {
        await ctx.with('close-communication-api', {}, async () => {
          await communicationApi.close()
        })
      } catch (err: any) {
        Analytics.handleError(err)
        ctx.error('close-pipeline-error', { error: err })
      }
    }
    await ctx.with('closing', {}, async () => {
      const to = timeoutPromise(120000)
      const closePromises = [closePipeline(), closeCommunicationApi()]
      await Promise.race([Promise.all(closePromises), to.promise])
      to.cancelHandle()
    })
  }

  async addSession (session: Session): Promise<void> {
    this.sessions.set(session.sessionId, session)
  }

  async removeSession (session: Session): Promise<void> {
    this.sessions.delete(session.sessionId)
  }

  checkHasUser (): boolean {
    for (const val of this.sessions.values()) {
      if (val.getUser() !== systemAccountUuid || val.subscribedUsers.size > 0) {
        return true
      }
    }
    return false
  }
}
function timeoutPromise (time: number): { promise: Promise<void>, cancelHandle: () => void } {
  let timer: any
  return {
    promise: new Promise((resolve) => {
      timer = setTimeout(resolve, time)
    }),
    cancelHandle: () => {
      clearTimeout(timer)
    }
  }
}
