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

import { Extension } from '@tiptap/core'

import { Level } from '@tiptap/extension-heading'
import Highlight from '@tiptap/extension-highlight'
import Link from '@tiptap/extension-link'
import Typography from '@tiptap/extension-typography'
import Underline from '@tiptap/extension-underline'
import StarterKit, { StarterKitOptions } from '@tiptap/starter-kit'

export interface DefaultKitOptions {
  codeBlock?: false
  heading?: {
    levels?: Level[]
  }
  history?: false
}

export const DefaultKit = Extension.create<DefaultKitOptions>({
  name: 'defaultKit',

  addExtensions () {
    const codeBlock: StarterKitOptions['codeBlock'] = this.options.codeBlock ?? {
      languageClassPrefix: 'language-',
      exitOnArrowDown: true,
      exitOnTripleEnter: true,
      HTMLAttributes: {
        class: 'proseCodeBlock'
      }
    }

    return [
      StarterKit.configure({
        code: {
          HTMLAttributes: {
            class: 'proseCode'
          }
        },
        blockquote: {
          HTMLAttributes: {
            class: 'proseBlockQuote'
          }
        },
        codeBlock,
        heading: this.options.heading,
        history: this.options.history
      }),
      Underline,
      Highlight.configure({
        multicolor: false
      }),
      Typography.configure({}),
      Link.configure({
        openOnClick: true,
        HTMLAttributes: { class: 'cursor-pointer', rel: 'noopener noreferrer', target: '_blank' }
      })
    ]
  }
})
