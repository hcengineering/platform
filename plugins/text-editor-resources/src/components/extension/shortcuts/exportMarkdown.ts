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

import { type MarkupNode } from '@hcengineering/text'
import { type ActionContext, type TextActionFunction } from '@hcengineering/text-editor'
import { markupToMarkdown } from '@hcengineering/text-markdown'
import { type Editor } from '@tiptap/core'

export const exportMarkdown: TextActionFunction = async (
  editor: Editor,
  event: MouseEvent,
  ctx: ActionContext
): Promise<void> => {
  try {
    const json = editor.getJSON()
    const markdown = markupToMarkdown(json as MarkupNode)

    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)

    const a = document.createElement('a')
    a.href = url
    a.download = 'document.md'
    a.style.display = 'none'

    document.body.appendChild(a)
    a.click()

    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  } catch (err) {
    console.error('exportMarkdown: failed to export markdown', err)
  }
}
