//
// Copyright © 2023, 2024, 2025 Hardcore Engineering Inc.
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

import { codeOptions } from '@hcengineering/text'
import { showPopup } from '@hcengineering/ui'
import { type Editor, Extension } from '@tiptap/core'
import type { CodeOptions } from '@tiptap/extension-code'
import type { CodeBlockOptions } from '@tiptap/extension-code-block'
import type { HardBreakOptions } from '@tiptap/extension-hard-break'
import type { Level } from '@tiptap/extension-heading'
import Highlight from '@tiptap/extension-highlight'
import Link from '@tiptap/extension-link'
import Typography from '@tiptap/extension-typography'
import Underline from '@tiptap/extension-underline'
import StarterKit from '@tiptap/starter-kit'

import LinkPopup from '../components/LinkPopup.svelte'
import { CodeBlockHighlighExtension, codeBlockHighlightOptions } from '../components/extension/codeblock'

export interface DefaultKitOptions {
  codeBlock?: Partial<CodeBlockOptions> | false
  code?: Partial<CodeOptions> | false
  hardBreak?: Partial<HardBreakOptions> | false
  heading?: {
    levels?: Level[]
  }
  history?: false
}

export const DefaultKit = Extension.create<DefaultKitOptions>({
  name: 'defaultKit',

  addExtensions () {
    return [
      StarterKit.configure({
        blockquote: {
          HTMLAttributes: {
            class: 'proseBlockQuote'
          }
        },
        code: this.options.code ?? codeOptions,
        codeBlock: false,
        hardBreak: this.options.hardBreak,
        heading: this.options.heading,
        history: this.options.history
      }),
      Underline,
      Highlight.configure({
        multicolor: false
      }),
      Typography.configure({}),
      Link.extend({ inclusive: false }).configure({
        openOnClick: false,
        HTMLAttributes: { class: 'cursor-pointer', rel: 'noopener noreferrer', target: '_blank' }
      }),
      CodeBlockHighlighExtension.configure(codeBlockHighlightOptions)
    ]
  }
})

export async function formatLink (editor: Editor): Promise<void> {
  const link = editor.getAttributes('link').href

  // give editor some time to handle blur event
  setTimeout(() => {
    showPopup(LinkPopup, { link }, undefined, undefined, (newLink) => {
      if (newLink === '') {
        editor.chain().focus().extendMarkRange('link').unsetLink().run()
      } else {
        editor.chain().focus().extendMarkRange('link').setLink({ href: newLink }).run()
      }
    })
  })
}
