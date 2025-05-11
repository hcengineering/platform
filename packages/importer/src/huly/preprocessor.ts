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

import { Attachment } from '@hcengineering/attachment'
import { type Person } from '@hcengineering/contact'
import { type Class, type Doc, type Ref, type Space } from '@hcengineering/core'
import { MarkupMarkType, type MarkupNode, MarkupNodeType, traverseNode, traverseNodeMarks } from '@hcengineering/text'
import * as fs from 'fs'
import { contentType } from 'mime-types'
import * as path from 'path'
import { type Logger } from '../importer/logger'
import { BaseMarkdownPreprocessor } from '../importer/preprocessor'
import { MentionMetadata, MetadataRegistry } from './registry'

export interface AttachmentMetadata {
  id: Ref<Attachment>
  name: string
  path: string
  parentId?: Ref<Doc>
  parentClass?: Ref<Class<Doc<Space>>>
  spaceId?: Ref<Space>
}

export class HulyMarkdownPreprocessor extends BaseMarkdownPreprocessor {
  constructor (
    private readonly urlProvider: (id: string) => string,
    private readonly logger: Logger,
    private readonly metadataRegistry: MetadataRegistry,
    private readonly attachMetaByPath: Map<string, AttachmentMetadata>,
    personsByName: Map<string, Ref<Person>>
  ) {
    super(personsByName)
  }

  process (json: MarkupNode, id: Ref<Doc>, spaceId: Ref<Space>): MarkupNode {
    traverseNode(json, (node) => {
      if (node.type === MarkupNodeType.image) {
        this.processImageNode(node, id, spaceId)
      } else {
        this.processLinkMarks(node, id, spaceId)
        this.processMentions(node)
      }
      return true
    })
    return json
  }

  private processImageNode (node: MarkupNode, id: Ref<Doc>, spaceId: Ref<Space>): void {
    const src = node.attrs?.src
    if (src === undefined) return

    const sourcePath = this.getSourcePath(id)
    if (sourcePath == null) return

    const href = decodeURI(src as string)
    const fullPath = path.resolve(path.dirname(sourcePath), href)
    const attachmentMeta = this.attachMetaByPath.get(fullPath)

    if (attachmentMeta === undefined) {
      this.logger.error(`Attachment image not found for ${fullPath}`)
      return
    }

    if (!this.metadataRegistry.hasRefMetadata(sourcePath)) {
      this.logger.error(`Source metadata not found for ${sourcePath}`)
      return
    }

    const sourceMeta = this.metadataRegistry.getRefMetadata(sourcePath)
    this.updateAttachmentMetadata(fullPath, attachmentMeta, id, spaceId, sourceMeta)
    this.alterImageNode(node, attachmentMeta.id, attachmentMeta.name)
  }

  private processLinkMarks (node: MarkupNode, id: Ref<Doc>, spaceId: Ref<Space>): void {
    traverseNodeMarks(node, (mark) => {
      if (mark.type !== MarkupMarkType.link) return

      const sourcePath = this.getSourcePath(id)
      if (sourcePath == null) return

      const href = decodeURI(mark.attrs?.href ?? '')
      const fullPath = path.resolve(path.dirname(sourcePath), href)

      if (this.metadataRegistry.hasRefMetadata(fullPath)) {
        const targetDocMeta = this.metadataRegistry.getRefMetadata(fullPath)
        this.alterMentionNode(node, targetDocMeta)
      } else if (this.attachMetaByPath.has(fullPath)) {
        const attachmentMeta = this.attachMetaByPath.get(fullPath)
        if (attachmentMeta !== undefined) {
          this.alterAttachmentLinkNode(node, attachmentMeta)
          if (this.metadataRegistry.hasRefMetadata(sourcePath)) {
            const sourceMeta = this.metadataRegistry.getRefMetadata(sourcePath)
            this.updateAttachmentMetadata(fullPath, attachmentMeta, id, spaceId, sourceMeta)
          }
        }
      } else {
        this.logger.log('Unknown link type, leave it as is: ' + href)
      }
    })
  }

  private alterImageNode (node: MarkupNode, id: string, name: string): void {
    node.type = MarkupNodeType.image
    if (node.attrs !== undefined) {
      node.attrs = {
        'file-id': id,
        src: this.urlProvider(id),
        width: node.attrs.width ?? null,
        height: node.attrs.height ?? null,
        align: node.attrs.align ?? null,
        alt: name,
        title: name
      }
      const mimeType = this.getContentType(name)
      if (mimeType !== undefined) {
        node.attrs['data-file-type'] = mimeType
      }
    }
  }

  private alterMentionNode (node: MarkupNode, targetMeta: MentionMetadata): void {
    node.type = MarkupNodeType.reference
    node.attrs = {
      id: targetMeta.id,
      label: targetMeta.refTitle,
      objectclass: targetMeta.class,
      text: '',
      content: ''
    }
  }

  private alterAttachmentLinkNode (node: MarkupNode, targetMeta: AttachmentMetadata): void {
    const stats = fs.statSync(targetMeta.path)
    node.type = MarkupNodeType.file
    node.attrs = {
      'file-id': targetMeta.id,
      'data-file-name': targetMeta.name,
      'data-file-size': stats.size,
      'data-file-href': targetMeta.path
    }
    const mimeType = this.getContentType(targetMeta.name)
    if (mimeType !== undefined) {
      node.attrs['data-file-type'] = mimeType
    }
  }

  private getContentType (fileName: string): string | undefined {
    const mimeType = contentType(fileName)
    return mimeType !== false ? mimeType : undefined
  }

  private getSourcePath (id: Ref<Doc>): string | null {
    const sourcePath = this.metadataRegistry.getPath(id)
    if (sourcePath === undefined) {
      this.logger.error(`Source file path not found for ${id}`)
      return null
    }
    return sourcePath
  }

  private updateAttachmentMetadata (
    fullPath: string,
    attachmentMeta: AttachmentMetadata,
    id: Ref<Doc>,
    spaceId: Ref<Space>,
    sourceMeta: MentionMetadata
  ): void {
    this.attachMetaByPath.set(fullPath, {
      ...attachmentMeta,
      spaceId,
      parentId: id,
      parentClass: sourceMeta.class as Ref<Class<Doc<Space>>>
    })
  }
}
