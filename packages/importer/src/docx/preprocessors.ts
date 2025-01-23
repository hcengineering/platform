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

import { AttrValue, MarkupNode, MarkupNodeType } from '@hcengineering/text'
import { dirname, join, relative } from 'path'
import { DocumentPreprocessorSpec, DocumentState } from './docx'
import documents from '@hcengineering/controlled-documents'

const _addStubHeader: DocumentPreprocessorSpec<DocumentState['header']> = (converter, inputOptions) => {
  return (document) => {
    const options: DocumentState['header'] = inputOptions ?? {
      class: 'documents:class:ControlledDocument',
      title: document.name,
      template: documents.template.ProductChangeControl,
      author: converter.options.owner,
      owner: converter.options.owner
    }
    const header = document.header ?? options
    return { ...document, header }
  }
}

interface ExtractImagesOptions {
  folder?: string
  extensions?: Record<string, string>
}

const _extractImages: DocumentPreprocessorSpec<ExtractImagesOptions> = (converter, inputOptions) => {
  const options = {
    folder: 'files',
    extensions: {
      'image/jpeg': '.jpeg',
      'image/jpg': '.jpeg',
      'image/png': '.png'
    },
    ...inputOptions
  }

  let imageCount = 0
  interface Image {
    extension: string
    buffer: Buffer
  }

  const extractBase64Image = (imageContent: AttrValue): Image | undefined => {
    if (typeof imageContent !== 'string' || !imageContent.startsWith('data:')) {
      return
    }

    const buffer = Buffer.from(imageContent.split(',')[1], 'base64')
    const type = imageContent.split(';')[0].split(':')[1]

    const extension = options.extensions[type]
    if (extension === undefined) {
      return
    }

    return { buffer, extension }
  }

  const transformImage = (dir: string, node: MarkupNode): MarkupNode => {
    if (node.type !== MarkupNodeType.image) {
      return node
    }

    const image = extractBase64Image(node.attrs?.src ?? '')
    if (image === undefined) {
      return node
    }

    imageCount++
    const path = join(options.folder, 'image_' + imageCount + image.extension)

    node = { ...node, attrs: { ...node.attrs, src: relative(dir, path) } }
    converter.addOutputFile(path, image.buffer)

    return node
  }

  return (document) => {
    const dir = relative(document.root, dirname(document.path))
    const markup = transformMarkupRecursive(document.markup, (node) => transformImage(dir, node))
    return { ...document, markup }
  }
}

const _cleanupMarkup: DocumentPreprocessorSpec<any> = (converter) => {
  const transform = (node: MarkupNode): MarkupNode => {
    if (node.type === MarkupNodeType.table_header) {
      node = { ...node, type: MarkupNodeType.table_cell }
    }
    return node
  }

  return (document) => {
    const markup = transformMarkupRecursive(document.markup, transform)
    return { ...document, markup }
  }
}

export const defaultDocumentPreprocessors = {
  _addStubHeader,
  _extractImages,
  _cleanupMarkup
}

function transformMarkupRecursive (node: MarkupNode, transformer: (node: MarkupNode) => MarkupNode): MarkupNode {
  let content = node.content
  if (content !== undefined) {
    content = content.map((node) => transformMarkupRecursive(node, transformer))
    node = { ...node, content }
  }
  return transformer(node)
}
