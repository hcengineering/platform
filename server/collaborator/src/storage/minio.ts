//
// Copyright © 2023, 2024 Hardcore Engineering Inc.
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

import {
  YDocVersion,
  loadCollaborativeDoc,
  saveCollaborativeDoc,
  takeCollaborativeDocSnapshot
} from '@hcengineering/collaboration'
import { CollaborativeDoc, MeasureContext } from '@hcengineering/core'
import { MinioService } from '@hcengineering/minio'
import { Doc as YDoc } from 'yjs'

import { Context } from '../context'

import { StorageAdapter } from './adapter'

export class MinioStorageAdapter implements StorageAdapter {
  constructor (
    private readonly ctx: MeasureContext,
    private readonly minio: MinioService
  ) {}

  async loadDocument (
    documentId: string,
    collaborativeDoc: CollaborativeDoc,
    context: Context
  ): Promise<YDoc | undefined> {
    const { workspaceId } = context

    await this.ctx.info('load document content from minio', { documentId, collaborativeDoc })
    return await this.ctx.with('load-document', {}, async (ctx) => {
      try {
        return await loadCollaborativeDoc(this.minio, workspaceId, collaborativeDoc, ctx)
      } catch (err) {
        await ctx.error('failed to load minio document', { documentId, collaborativeDoc, error: err })
        return undefined
      }
    })
  }

  async saveDocument (
    documentId: string,
    collaborativeDoc: CollaborativeDoc,
    document: YDoc,
    context: Context
  ): Promise<void> {
    const { workspaceId } = context

    await this.ctx.info('save document content to minio', { documentId })
    await this.ctx.with('save-document', {}, async (ctx) => {
      await saveCollaborativeDoc(this.minio, workspaceId, collaborativeDoc, document, ctx)
    })
  }

  async takeSnapshot (
    documentId: string,
    collaborativeDoc: CollaborativeDoc,
    document: YDoc,
    context: Context
  ): Promise<YDocVersion | undefined> {
    const { clientFactory, workspaceId } = context

    const client = await clientFactory({ derived: false })
    const timestamp = Date.now()

    const yDocVersion: YDocVersion = {
      versionId: `${timestamp}`,
      name: 'Automatic snapshot',
      createdBy: client.user,
      createdOn: timestamp
    }

    await this.ctx.info('take document snapshot', { documentId })
    await this.ctx.with('take-snapshot', {}, async (ctx) => {
      await takeCollaborativeDocSnapshot(this.minio, workspaceId, collaborativeDoc, document, yDocVersion, ctx)
    })

    return yDocVersion
  }
}
