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

import { MarkupNode, htmlToJSON } from '@hcengineering/text'
import { markupToMarkdown } from '@hcengineering/text-markdown'
import { mkdir, readdir, readFile, writeFile } from 'fs/promises'
import * as yaml from 'js-yaml'
import { basename, dirname, extname, join, relative } from 'path'
import { UnifiedControlledDocumentHeader, UnifiedDocumentTemplateHeader } from '../huly/unified'

export interface DocumentConverterOptions {
  outputPath: string
  owner: string
  steps: DocumentPreprocessorOptions<any>[]
  htmlConverter: (path: string) => Promise<string>
}

export interface DocumentState {
  name: string
  path: string
  root: string
  markup: MarkupNode
  header?: UnifiedControlledDocumentHeader | UnifiedDocumentTemplateHeader
}

export interface DocumentPreprocessorOptions<T> {
  name: string
  options?: T
}

export type DocumentPreprocessor = (document: DocumentState) => DocumentState | undefined
export type DocumentPreprocessorSpec<T> = (converter: DocumentConverter, options?: T) => DocumentPreprocessor

export class DocumentConverter {
  documents = new Map<string, DocumentState>()
  output = new Map<string, Buffer | string>()
  preprocessors: DocumentPreprocessor[]

  options: DocumentConverterOptions

  constructor (options: DocumentConverterOptions, specs: Record<string, DocumentPreprocessorSpec<any>>) {
    this.options = options
    this.preprocessors = []

    for (const step of options.steps) {
      const spec = specs[step.name]
      if (spec === undefined) {
        throw new Error(`Unknown step: ${step.name}`)
      }
      this.preprocessors.push(spec(this, step.options))
    }
  }

  async processFolder (root: string): Promise<void> {
    const files = await scanFiles(root)
    for (const path of files) {
      const ext = extname(path)
      if (ext === '.docx') await this.processDocument(path, root)
      else if (ext === '.md') this.addOutputFile(relative(root, path), await readFile(path, 'utf-8'))
    }
  }

  async processDocument (path: string, root: string): Promise<void> {
    const htmlString = await this.options.htmlConverter(path)
    const markup = htmlToJSON(htmlString)

    let document: DocumentState = {
      name: fileNameNoExt(path),
      path,
      root,
      markup
    }

    for (const processor of this.preprocessors) {
      document = processor(document) ?? document
    }

    this.documents.set(path, document)

    const content = compileMarkdown(document)
    this.addOutputFile(join(relative(root, dirname(path)), fileNameNoExt(path)) + '.md', content)
  }

  addOutputFile (rel: string, content: string | Buffer): void {
    this.output.set(join(this.options.outputPath, rel), content)
  }

  async flush (): Promise<void> {
    for (const [path, content] of this.output) {
      await mkdir(dirname(path), { recursive: true })
      await writeFile(path, content as any)
    }
  }
}

function compileMarkdown (file: DocumentState): string {
  const markdown = markupToMarkdown(file.markup, { refUrl: 'ref://', imageUrl: '' })

  const headerYaml = yaml.dump(file.header)
  const headerString = '---\n' + headerYaml + '---\n'

  const finalContent = headerString + markdown
  return finalContent
}

function fileNameNoExt (path: string): string {
  const bname = basename(path)
  const ext = extname(path)
  return bname.slice(0, bname.length - ext.length)
}

async function scanFiles (dir: string): Promise<string[]> {
  const filesAndDirs = await readdir(dir, { recursive: true, withFileTypes: true })
  const files = filesAndDirs.filter((file) => !file.isDirectory()).map((f) => join(f.path, f.name))
  return files
}
