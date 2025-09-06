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

import {
  ArrOf,
  Class,
  Client,
  Collection,
  Doc,
  isId,
  MarkupBlobRef,
  matchQuery,
  MeasureContext,
  Mixin,
  Ref,
  RefTo,
  toIdMap,
  Type,
  WorkspaceIds,
  type IdMap,
  type Space
} from '@hcengineering/core'
import attachment from '@hcengineering/model-attachment'
import core from '@hcengineering/model-core'
import { StorageAdapter } from '@hcengineering/server-core'
import { UnifiedAttachment, UnifiedDoc } from './types'

interface DocCache {
  byId: IdMap<Doc>
  byAttached: Map<Ref<Doc>, Doc[]>
}
export class UnifiedConverter {
  // Fields that should not be resolved
  private readonly skipResolveFields = new Set(['_class', '_id', 'collection', 'attachedTo', 'attachedToClass'])

  constructor (
    private readonly context: MeasureContext,
    private readonly client: Client,
    private readonly storage: StorageAdapter,
    private readonly wsIds: WorkspaceIds
  ) {}

  documentCache = new Map<Ref<Class<Doc>>, DocCache | Promise<DocCache>>()

  async convert (doc: Doc, attributesOnly: boolean = false): Promise<UnifiedDoc> {
    console.log('Convert', doc._id, doc._class, (doc as any).title)

    const hierarchy = this.client.getHierarchy()
    const attributes = hierarchy.getAllAttributes(doc._class)
    const processed: Record<string, any> = {}

    const markdownFields: string[] = []
    const collabFields: string[] = []
    const refFields: string[] = []
    const collectionFields: string[] = []

    // Process all attributes
    for (const [key, value] of Object.entries(doc)) {
      if (this.skipResolveFields.has(key)) {
        processed[key] = value
        continue
      }

      const attr = attributes.get(key)
      if (attr !== undefined) {
        const result = await this.resolveAttribute(
          key,
          attr.type,
          value,
          markdownFields,
          collabFields,
          refFields,
          collectionFields,
          doc._id,
          doc._class,
          attributesOnly,
          attr.markdown
        )
        if (result !== undefined) {
          processed[key] = result
        }
        continue
      }

      // Process mixin or add raw value
      if (hierarchy.isMixin(key as Ref<Mixin<Doc>>) && hierarchy.hasMixin(doc, key as Ref<Mixin<Doc>>)) {
        const mixinAttrs = hierarchy.getAllAttributes(key as Ref<Mixin<Doc>>)
        const mixinData: Record<string, any> = {}

        for (const [mixinKey, mixinValue] of Object.entries(value as object)) {
          const mixinAttr = mixinAttrs.get(mixinKey)
          if (mixinAttr !== undefined && !this.skipResolveFields.has(mixinKey)) {
            const result = await this.resolveAttribute(
              mixinKey,
              mixinAttr.type,
              mixinValue,
              markdownFields,
              collabFields,
              refFields,
              collectionFields,
              doc._id,
              doc._class,
              attributesOnly,
              mixinAttr.markdown
            )
            if (result !== undefined) {
              mixinData[mixinKey] = result
            }
          }
        }

        if (Object.keys(mixinData).length > 0) {
          processed[key] = mixinData
        }
      } else {
        processed[key] = value
      }
    }

    if (collabFields.length > 1) {
      console.warn(`Document ${doc._id} of class ${doc._class} has multiple collab fields: ${collabFields.join(', ')}`)
    }

    const attachments = attributesOnly ? undefined : await this.resolveAttachments(doc._id, doc._class)

    return {
      _class: doc._class,
      space: doc.space,
      _id: doc._id,
      data: processed,
      markdownFields,
      collabFields,
      collectionFields,
      refFields,
      attachments
    }
  }

  private async resolveAttribute (
    key: string,
    type: Type<any>,
    value: any,
    markdownFields: string[],
    collabFields: string[],
    refFields: string[],
    collectionFields: string[],
    docId: Ref<Doc>,
    docClass: Ref<Class<Doc>>,
    attributesOnly: boolean,
    isMarkdown?: boolean
  ): Promise<any> {
    if (value == null) return undefined

    const hierarchy = this.client.getHierarchy()

    if (type._class === core.class.TypeString && isMarkdown === true) {
      markdownFields.push(key)
      return value
    }

    if (type._class === core.class.TypeMarkup) {
      markdownFields.push(key)
      // const markdown = await markupToMarkdown(value as Markup, '', '')
      return value // todo: test
    }

    if (type._class === core.class.TypeCollaborativeDoc) {
      if (attributesOnly) {
        return undefined
      }

      const result = await this.resolveMarkdown(value as MarkupBlobRef)
      collabFields.push(key)
      return result
    }

    if (type._class === core.class.RefTo) {
      const to = (type as RefTo<Doc>).to
      if (hierarchy.isDerived(to, core.class.Doc)) {
        refFields.push(key)
        return await this.resolveReference(value as Ref<Doc>, to)
      }
    }

    if (type._class === core.class.Collection && key === 'attachments') {
      return undefined
    }

    if (type._class === core.class.Collection) {
      if (value.length === 0) {
        return undefined
      }

      collectionFields.push(key)

      // Get all documents of the collection
      const { byAttached } = await this.getCache((type as Collection<any>).of)
      const cdocs = byAttached.get(docId) ?? []
      const collectionDocs = matchQuery(
        cdocs,
        {
          attachedTo: docId,
          attachedToClass: docClass,
          collection: key
        },
        (type as Collection<any>).of,
        hierarchy
      )

      // Convert each document of the collection
      const result: UnifiedDoc<any>[] = []
      for (const doc of collectionDocs) {
        result.push(await this.convert(doc, attributesOnly))
      }
      return result
    }

    if (type._class === core.class.TypeTimestamp || type._class === core.class.TypeDate) {
      return this.formatTimestamp(value as number)
    }

    if (type._class === core.class.ArrOf) {
      const result: any[] = []
      for (const element of value as any[]) {
        const of = (type as ArrOf<any>).of
        result.push(
          await this.resolveAttribute(
            '',
            of,
            element,
            markdownFields,
            collabFields,
            refFields,
            collectionFields,
            docId,
            docClass,
            attributesOnly
          )
        )
      }
      return result
    }

    return value
  }

  private formatTimestamp (timestamp: number): string {
    return new Date(timestamp).toISOString()
  }

  private async resolveReference (ref: Ref<Doc>, to: Ref<Class<Doc>>): Promise<string> {
    if (!isId(ref)) return ref

    try {
      const { byId } = await this.getCache(to)

      const doc = byId.get(ref)
      if (doc === undefined) {
        console.warn(`Referenced document not found: ${ref}`)
        return ref
      }

      // Try to get the most meaningful identifier
      return (doc as any).identifier ?? (doc as any).title ?? (doc as any).email ?? (doc as any).name ?? doc._id
    } catch (err) {
      console.error(`Failed to resolve reference: ${ref}`, err)
      return ref
    }
  }

  private async getCache (to: Ref<Class<Doc<Space>>>): Promise<DocCache> {
    let p = this.documentCache.get(to)
    if (p instanceof Promise) {
      p = await p
    }
    if (p === undefined) {
      p = this.loadCache(to)
      this.documentCache.set(to, p)
      p = await p
      this.documentCache.set(to, p)
    }
    return p
  }

  async loadCache (_class: Ref<Class<Doc>>): Promise<DocCache> {
    const allIds = await this.client.findAll(_class, {}, { projection: { _id: 1 } })
    const docs: Doc[] = []
    console.log(`Loading cache for ${_class} with ${allIds.length} documents`)
    while (allIds.length > 0) {
      const batch = allIds.splice(0, 10000).map((it) => it._id)
      const batchDocs = await this.client.findAll(_class, { _id: { $in: batch } })
      docs.push(...batchDocs)
    }

    const byAttached = new Map<Ref<Doc>, Doc[]>()
    for (const doc of docs) {
      const attachedTo = (doc as any).attachedTo as Ref<Doc>
      if (attachedTo == null) {
        continue
      }
      byAttached.set(attachedTo, (byAttached.get(attachedTo) ?? []).concat(doc))
    }
    return {
      byId: toIdMap(docs),
      byAttached
    }
  }

  private async resolveMarkdown (blobRef: MarkupBlobRef): Promise<string> {
    console.log(`Resolving markup content for ${blobRef}`)
    // return 'test'
    try {
      const buffer = await this.storage.read(this.context, this.wsIds, blobRef)
      if (buffer === undefined) {
        console.error(`Blob not found: ${blobRef}`)
        return ''
      }

      const markup = Buffer.concat(buffer as any).toString()
      // const markdown = await markupToMarkdown(markup, '', '')
      return markup // todo: test it is a markdown
    } catch (err) {
      console.error(`Failed to resolve markup content: ${blobRef}`, err)
      return ''
    }
  }

  private async resolveAttachments (
    docId: Ref<Doc>,
    docClass: Ref<Class<Doc>>
  ): Promise<UnifiedAttachment[] | undefined> {
    const { byAttached } = await this.getCache(attachment.class.Attachment)
    const rawAttachments = byAttached.get(docId) ?? []
    const attachments = matchQuery(
      rawAttachments,
      {
        attachedTo: docId,
        attachedToClass: docClass,
        collection: 'attachments'
      },
      attachment.class.Attachment,
      this.client.getHierarchy()
    )

    if (attachments.length === 0) {
      return undefined
    }

    // Create attachments with getData callbacks
    const resolved = attachments.map(
      (attachment): UnifiedAttachment => ({
        id: attachment._id,
        name: (attachment as any).name,
        size: (attachment as any).size,
        contentType: (attachment as any).contentType,
        getData: async () => {
          const buffer = await this.storage.read(this.context, this.wsIds, (attachment as any).file)

          if (buffer === undefined) {
            console.error(`Attachment not found: ${attachment._id}`)
            return Buffer.from([])
          }

          return Buffer.concat(buffer as any)
        }
      })
    )

    return resolved
  }
}
