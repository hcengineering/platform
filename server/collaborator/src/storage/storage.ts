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
import core, {
  CollaborativeDoc,
  MeasureContext,
  collaborativeDocWithLastVersion,
  toWorkspaceString
} from '@hcengineering/core'
import { MinioService } from '@hcengineering/minio'
import { Transformer } from '@hocuspocus/transformer'
import { MongoClient } from 'mongodb'
import { Doc, Doc as YDoc } from 'yjs'

import { Context } from '../context'

import { StorageAdapter } from './adapter'
import { PlatformDocumentId } from '../types'

export class PlatformStorageAdapter implements StorageAdapter {
  constructor (
    private readonly ctx: MeasureContext,
    private readonly minio: MinioService,
    private readonly mongodb: MongoClient,
    private readonly transformer: Transformer
  ) {}

  async loadDocument (documentName: string, context: Context): Promise<YDoc | undefined> {
    const { workspaceId, collaborativeDocId, platformDocId } = context
    const ctx = this.ctx

    let ydoc: YDoc | undefined

    // try load from minio first
    if (collaborativeDocId !== undefined) {
      await ctx.info('load document content from minio', { documentName, collaborativeDocId })
      ydoc = await ctx.with('load-document', { storage: 'minio' }, async (ctx) => {
        try {
          return await loadCollaborativeDoc(this.minio, workspaceId, collaborativeDocId, ctx)
        } catch (err) {
          await ctx.error('failed to load minio document', { documentName, collaborativeDocId, error: err })
          return undefined
        }
      })
    }

    if (ydoc !== undefined) {
      return ydoc
    }

    // TODO temporary solution
    // if we failed loading document from minio, try to fetch it from mongodb
    if (platformDocId !== undefined) {
      await ctx.info('load document content from platform', { documentName, platformDocId })
      ydoc = await ctx.with('load-document', { storage: 'platform' }, async (ctx) => {
        try {
          return await this.loadPlatformDoc(ctx, platformDocId, context)
        } catch (err) {
          await ctx.error('failed to load platform document', { documentName, platformDocId, error: err })
          return undefined
        }
      })
    }

    return ydoc
  }

  async saveDocument (documentName: string, document: YDoc, context: Context): Promise<void> {
    const { workspaceId, collaborativeDocId, platformDocId } = context
    const ctx = this.ctx

    let snapshot: YDocVersion | undefined
    if (collaborativeDocId !== undefined) {
      await ctx.info('take document snapshot', { documentName })
      snapshot = await ctx.with('take-snapshot', {}, async () => {
        try {
          return await this.takeSnapshot(ctx, collaborativeDocId, document, context)
        } catch (err) {
          await ctx.error('failed to take document snapshot', { documentName, error: err })
        }
      })
    }

    if (collaborativeDocId !== undefined) {
      await ctx.info('save document content to minio', { documentName })
      await this.ctx.with('save-document', { storage: 'minio' }, async (ctx) => {
        await saveCollaborativeDoc(this.minio, workspaceId, collaborativeDocId, document, ctx)
      })
    }

    if (platformDocId !== undefined) {
      await ctx.info('save document content to platform', { documentName })
      await this.ctx.with('save-document', { storage: 'platform' }, async (ctx) => {
        await this.savePlatformDoc(ctx, documentName, platformDocId, document, snapshot, context)
      })
    }
  }

  async takeSnapshot (
    ctx: MeasureContext,
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

    await takeCollaborativeDocSnapshot(this.minio, workspaceId, collaborativeDoc, document, yDocVersion, ctx)

    return yDocVersion
  }

  async loadPlatformDoc (
    ctx: MeasureContext,
    platformDocId: PlatformDocumentId,
    context: Context
  ): Promise<YDoc | undefined> {
    const { workspaceId } = context
    const { objectDomain, objectId, objectAttr } = platformDocId

    const doc = await ctx.with('query', {}, async () => {
      const db = this.mongodb.db(toWorkspaceString(workspaceId))
      return await db.collection<Doc>(objectDomain).findOne({ _id: objectId }, { projection: { [objectAttr]: 1 } })
    })

    // TODO check if content is HTML
    const content = doc !== null && objectAttr in doc ? ((doc as any)[objectAttr] as string) : ''

    return await ctx.with('transform', {}, () => {
      return this.transformer.toYdoc(content, objectAttr)
    })
  }

  async savePlatformDoc (
    ctx: MeasureContext,
    documentName: string,
    platformDocId: PlatformDocumentId,
    document: YDoc,
    snapshot: YDocVersion | undefined,
    context: Context
  ): Promise<void> {
    const { objectId, objectClass, objectAttr } = platformDocId

    const { clientFactory } = context

    const client = await ctx.with('connect', {}, async () => {
      return await clientFactory({ derived: false })
    })

    const attribute = client.getHierarchy().findAttribute(objectClass, objectAttr)
    if (attribute === undefined) {
      await this.ctx.info('attribute not found', { documentName, objectClass, objectAttr })
      return
    }

    const current = await ctx.with('query', {}, async () => {
      return await client.findOne(objectClass, { _id: objectId })
    })

    if (current === undefined) {
      return
    }

    const hierarchy = client.getHierarchy()
    if (hierarchy.isDerived(attribute.type._class, core.class.TypeCollaborativeDoc)) {
      const collaborativeDoc = (current as any)[objectAttr] as CollaborativeDoc
      const newCollaborativeDoc =
        snapshot !== undefined
          ? collaborativeDocWithLastVersion(collaborativeDoc, snapshot.versionId)
          : collaborativeDoc

      await ctx.with('update', {}, async () => {
        await client.diffUpdate(current, { [objectAttr]: newCollaborativeDoc })
      })
    } else if (hierarchy.isDerived(attribute.type._class, core.class.TypeCollaborativeMarkup)) {
      // TODO a temporary solution while we are keeping Markup in Mongo
      const content = await ctx.with('transform', {}, () => {
        return this.transformer.fromYdoc(document, objectAttr)
      })
      await ctx.with('update', {}, async () => {
        await client.diffUpdate(current, { [objectAttr]: content })
      })
    }
  }
}
