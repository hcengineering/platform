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

import { YDocVersion } from '@hcengineering/collaboration'
import core, {
  Class,
  CollaborativeDoc,
  Doc,
  MeasureContext,
  Ref,
  collaborativeDocWithLastVersion
} from '@hcengineering/core'
import { Transformer } from '@hocuspocus/transformer'
import { Doc as YDoc } from 'yjs'

import { Context } from '../context'

import { StorageAdapter } from './adapter'

interface PlatformDocumentId {
  workspaceUrl: string
  objectClass: Ref<Class<Doc>>
  objectId: Ref<Doc>
  objectAttr: string
}

function parseDocumentId (documentId: string): PlatformDocumentId {
  const [workspaceUrl, objectClass, objectId, objectAttr] = documentId.split('/')
  return {
    workspaceUrl: workspaceUrl ?? '',
    objectClass: (objectClass ?? '') as Ref<Class<Doc>>,
    objectId: (objectId ?? '') as Ref<Doc>,
    objectAttr: objectAttr ?? ''
  }
}

function isValidDocumentId (documentId: Omit<PlatformDocumentId, 'workspaceUrl'>, context: Context): boolean {
  return documentId.objectClass !== '' && documentId.objectId !== '' && documentId.objectAttr !== ''
}

export class PlatformStorageAdapter implements StorageAdapter {
  constructor (
    private readonly ctx: MeasureContext,
    private readonly transformer: Transformer
  ) {}

  async loadDocument (documentId: string, context: Context): Promise<YDoc | undefined> {
    await this.ctx.error('loading documents from the platform not supported', { documentId })
    return undefined
  }

  async saveDocument (
    documentId: string,
    document: YDoc,
    snapshot: YDocVersion | undefined,
    context: Context
  ): Promise<void> {
    const { clientFactory } = context
    const { objectId, objectClass, objectAttr } = parseDocumentId(documentId)

    if (!isValidDocumentId({ objectId, objectClass, objectAttr }, context)) {
      await this.ctx.error('malformed document id', { documentId })
      return undefined
    }

    await this.ctx.with('save-document', {}, async (ctx) => {
      const client = await ctx.with('connect', {}, async () => {
        return await clientFactory({ derived: false })
      })

      const attribute = client.getHierarchy().findAttribute(objectClass, objectAttr)
      if (attribute === undefined) {
        await this.ctx.info('attribute not found', { documentId, objectClass, objectAttr })
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
    })
  }

  async takeSnapshot (documentId: string, document: YDoc, context: Context): Promise<YDocVersion | undefined> {
    await this.ctx.error('taking snapshotsin mongodb not supported', { documentId })
    return undefined
  }
}
