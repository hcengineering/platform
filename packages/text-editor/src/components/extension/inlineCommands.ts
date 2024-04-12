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
//

import { Extension } from '@tiptap/core'
import Suggestion, { type SuggestionOptions } from './suggestion'
import { PluginKey } from '@tiptap/pm/state'

export interface InlineCommandsOptions {
  suggestion: Omit<SuggestionOptions, 'editor'>
}

/*
 * @public
 */
export const InlineCommandsExtension = Extension.create<InlineCommandsOptions>({
  name: 'inline-commands',

  addOptions () {
    return {
      suggestion: {
        char: '/',
        startOfLine: true
      }
    }
  },

  addProseMirrorPlugins () {
    return [
      Suggestion({
        pluginKey: new PluginKey('inline-commands'),
        editor: this.editor,
        ...this.options.suggestion
      })
    ]
  }
})
