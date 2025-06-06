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

import { showPopup } from '@hcengineering/ui'
import { Extension } from '@tiptap/core'
import { type MarkType } from '@tiptap/pm/model'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import LinkPopup from '../LinkPopup.svelte'

export const LinkUtilsExtension = Extension.create<any>({
  name: 'linkUtils',

  addKeyboardShortcuts () {
    return {
      'Mod-k': () => {
        const { from, to } = this.editor.state.selection
        if (from === to) return false

        const link = this.editor.getAttributes('link').href

        showPopup(LinkPopup, { link }, undefined, undefined, (newLink) => {
          if (newLink === '') {
            this.editor.chain().focus().extendMarkRange('link').unsetLink().run()
          } else {
            this.editor.chain().focus().extendMarkRange('link').setLink({ href: newLink }).run()
          }
        })

        return true
      }
    }
  },

  addProseMirrorPlugins () {
    return [LinkClickHandlerPlugin({ type: this.editor.schema.marks.link })]
  }
})

interface LinkClickHandlerOptions {
  type: MarkType
}

export function LinkClickHandlerPlugin (options: LinkClickHandlerOptions): Plugin {
  return new Plugin({
    key: new PluginKey('handleClickLink'),
    props: {
      handleClick: (view, pos, event) => {
        const $pos = view.state.doc.resolve(pos)
        const link = options.type.isInSet($pos.marks())
        if (typeof link?.attrs.href === 'string') {
          window.open(link.attrs.href, link.attrs.target)
          return true
        }

        return false
      }
    }
  })
}
