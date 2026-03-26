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

export const pasteAsMarkdown: TextActionFunction = async (
  editor: Editor,
  event: MouseEvent,
  ctx: ActionContext
): Promise<void> => {
  try {
    const text = await navigator.clipboard.readText()
    if (text === '') return

    const markupNode = markdownToMarkup(text)
    const cleaned = cleanUnknownContent(editor.view.state.schema, markupNode)
    const content = Node.fromJSON(editor.view.state.schema, cleaned)
    content.check()

    editor.view.dispatch(editor.view.state.tr.replaceSelectionWith(content))
  } catch (err) {
    console.error('pasteAsMarkdown: failed to paste markdown content', err)
  }
}
