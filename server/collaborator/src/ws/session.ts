//
// Copyright © 2024 Hardcore Engineering Inc.
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

import { Class, Doc, MeasureContext, Ref, WorkspaceId } from '@hcengineering/core'
import { Hocuspocus } from '@hocuspocus/server'
import { Transformer } from '@hocuspocus/transformer'
import { applyUpdate, encodeStateAsUpdate } from 'yjs'

import { Context } from '../context'
import { ClientFactory } from '../platform'

import { Session } from './types'

export class ClientSession implements Session {
  constructor (
    readonly connectionId: string,
    private readonly workspaceId: WorkspaceId,
    private readonly clientFactory: ClientFactory,
    private readonly hocuspocus: Hocuspocus,
    private readonly transformer: Transformer
  ) {}

  async ping (): Promise<string> {
    return 'pong'
  }

  async get (ctx: MeasureContext, classId: Ref<Class<Doc>>, docId: Ref<Doc>, attribute: string): Promise<string> {
    const documentId = `minio://${docId}%${attribute}`

    const context = this.getContext(documentId)

    const connection = await ctx.with('connection', {}, async () => {
      return await this.hocuspocus.openDirectConnection(documentId, context)
    })

    try {
      return await ctx.with('transform', {}, async () => {
        let content = ''
        await connection.transact((document) => {
          content = this.transformer.fromYdoc(document, attribute)
        })
        return content
      })
    } finally {
      await connection.disconnect()
    }
  }

  async update (
    ctx: MeasureContext,
    classId: Ref<Class<Doc>>,
    docId: Ref<Doc>,
    attribute: string,
    content: string
  ): Promise<void> {
    const documentId = `minio://${docId}%${attribute}`

    const context = this.getContext(documentId)

    const update = await ctx.with('transform', {}, async () => {
      const ydoc = this.transformer.toYdoc(content, attribute)
      return encodeStateAsUpdate(ydoc)
    })

    const connection = await ctx.with('connection', {}, async () => {
      return await this.hocuspocus.openDirectConnection(documentId, context)
    })

    try {
      await ctx.with('update', {}, async () => {
        await connection.transact((document) => {
          const fragment = document.getXmlFragment(attribute)
          fragment.delete(0, fragment.length)
          applyUpdate(document, update)
        })
      })
    } finally {
      await connection.disconnect()
    }
  }

  private getContext (documentId: string): Context {
    return {
      connectionId: this.connectionId,
      workspaceId: this.workspaceId,
      clientFactory: this.clientFactory,
      initialContentId: documentId,
      targetContentId: ''
    }
  }
}
