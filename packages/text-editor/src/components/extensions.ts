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

import { type CompletionOptions } from '../Completion'
import MentionList from './MentionList.svelte'
import { SvelteRenderer } from './node-view'
import type { SuggestionKeyDownProps, SuggestionProps } from './extension/suggestion'

export const mInsertTable = [
  {
    label: '2x2',
    rows: 2,
    cols: 2,
    header: false
  },
  {
    label: '3x3',
    rows: 3,
    cols: 3,
    header: false
  },
  {
    label: '2x1',
    rows: 2,
    cols: 1,
    header: false
  },
  {
    label: '5x5',
    rows: 5,
    cols: 5,
    header: false
  },
  {
    label: '1x2',
    rows: 1,
    cols: 2,
    header: false
  },
  {
    label: 'Headed 2x2',
    rows: 2,
    cols: 2,
    header: true
  },
  {
    label: 'Headed 3x3',
    rows: 3,
    cols: 3,
    header: true
  },
  {
    label: 'Headed 2x1',
    rows: 2,
    cols: 1,
    header: true
  },
  {
    label: 'Headed 5x5',
    rows: 5,
    cols: 5,
    header: true
  },
  {
    label: 'Headed 1x2',
    rows: 1,
    cols: 2,
    header: true
  }
]

/**
 * @public
 */
export const completionConfig: Partial<CompletionOptions> = {
  HTMLAttributes: {
    class: 'reference'
  },
  suggestion: {
    items: async () => {
      return []
    },
    render: () => {
      let component: any

      return {
        onStart: (props: SuggestionProps) => {
          component = new SvelteRenderer(MentionList, {
            element: document.body,
            props: {
              ...props,
              close: () => {
                component.destroy()
              }
            }
          })
        },
        onUpdate (props: SuggestionProps) {
          component.updateProps(props)
        },
        onKeyDown (props: SuggestionKeyDownProps) {
          if (props.event.key === 'Escape') {
            props.event.stopPropagation()
          }
          return component.onKeyDown(props)
        },
        onExit () {
          component.destroy()
        }
      }
    }
  }
}
