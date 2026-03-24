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

import { type ActionContext, type TextActionFunction } from '@hcengineering/text-editor'
import { markdownToMarkup } from '@hcengineering/text-markdown'
import { type Editor } from '@tiptap/core'
import { Node } from '@tiptap/pm/model'

import { cleanUnknownContent } from './smartPaste'

export const markdownFileImport: TextActionFunction = async (
  editor: Editor,
  event: MouseEvent,
  ctx: ActionContext
): Promise<void> => {
  try {
    const file = await selectMarkdownFile()
    if (file === undefined) return

    const raw = await file.text()
    const text = raw.replace(/^---\n[\s\S]*?\n---\n/, '')

    const markupNode = markdownToMarkup(text)
    const cleaned = cleanUnknownContent(editor.view.state.schema, markupNode)
    const content = Node.fromJSON(editor.view.state.schema, cleaned)
    content.check()

    const { state } = editor.view
    const { from, to } = state.selection

    if (from === to) {
      // No selection — insert at end of document
      const endPos = state.doc.content.size
      editor.view.dispatch(state.tr.insert(endPos, content))
    } else {
      editor.view.dispatch(state.tr.replaceSelectionWith(content))
    }
  } catch (err) {
    console.error('markdownFileImport: failed to import markdown file', err)
  }
}

function selectMarkdownFile (): Promise<File | undefined> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.md,.markdown,text/markdown'
    input.style.display = 'none'

    input.addEventListener('change', () => {
      const file = input.files?.[0]
      resolve(file)
      input.remove()
    })

    document.body.appendChild(input)
    input.click()
  })
}
