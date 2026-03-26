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

import { markdownToMarkup } from '@hcengineering/text-markdown'
import { Extension } from '@tiptap/core'
import { Node } from '@tiptap/pm/model'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { type EditorView } from '@tiptap/pm/view'

import { cleanUnknownContent } from './smartPaste'

function isMarkdownFile (file: File): boolean {
  return file.name.endsWith('.md') || file.name.endsWith('.markdown') || file.type === 'text/markdown'
}

function stripFrontmatter (text: string): string {
  return text.replace(/^---\n[\s\S]*?\n---\n/, '')
}

async function handleMarkdownFile (file: File, view: EditorView, pos: number): Promise<void> {
  try {
    const raw = await file.text()
    const text = stripFrontmatter(raw)

    const markupNode = markdownToMarkup(text)
    const cleaned = cleanUnknownContent(view.state.schema, markupNode)
    const content = Node.fromJSON(view.state.schema, cleaned)
    content.check()

    const tr = view.state.tr.insert(pos, content)
    view.dispatch(tr)
  } catch (err) {
    console.error('markdownFileDrop: failed to handle markdown file', err)
  }
}

export const MarkdownFileDropExtension = Extension.create({
  name: 'markdown-file-drop',

  addProseMirrorPlugins () {
    return [
      new Plugin({
        key: new PluginKey('markdown-file-drop'),
        props: {
          handleDrop (view: EditorView, event: DragEvent): boolean {
            const files = event.dataTransfer?.files
            if (files === undefined || files === null) return false

            for (const file of files) {
              if (isMarkdownFile(file)) {
                event.preventDefault()
                const coords = view.posAtCoords({ left: event.clientX, top: event.clientY })
                const pos = coords?.pos ?? view.state.selection.$from.pos
                void handleMarkdownFile(file, view, pos)
                return true
              }
            }

            return false
          },

          handlePaste (view: EditorView, event: ClipboardEvent): boolean {
            // Check for markdown files in clipboard
            const files = event.clipboardData?.files
            if (files !== undefined && files !== null) {
              for (const file of files) {
                if (isMarkdownFile(file)) {
                  event.preventDefault()
                  const pos = view.state.selection.$from.pos
                  void handleMarkdownFile(file, view, pos)
                  return true
                }
              }
            }

            // Check for text/markdown MIME type in clipboard data
            const markdownData = event.clipboardData?.getData('text/markdown')
            if (markdownData !== undefined && markdownData !== null && markdownData !== '') {
              event.preventDefault()
              const text = stripFrontmatter(markdownData)

              try {
                const markupNode = markdownToMarkup(text)
                const cleaned = cleanUnknownContent(view.state.schema, markupNode)
                const content = Node.fromJSON(view.state.schema, cleaned)
                content.check()

                const pos = view.state.selection.$from.pos
                const tr = view.state.tr.insert(pos, content)
                view.dispatch(tr)
              } catch (err) {
                console.error('markdownFileDrop: failed to paste markdown content', err)
              }

              return true
            }

            return false
          }
        }
      })
    ]
  }
})
