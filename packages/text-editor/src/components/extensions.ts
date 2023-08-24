import { CompletionOptions } from '@hcengineering/text'

import MentionList from './MentionList.svelte'
import { SvelteRenderer } from './SvelteRenderer'

import '@tiptap/starter-kit'
import '@tiptap/extension-link'
import '@tiptap/extension-table'

export { defaultExtensions, headingLevels } from '@hcengineering/text'

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
    items: async (query: { query: string }) => {
      return []
    },
    render: () => {
      let component: any

      return {
        onStart: (props: any) => {
          component = new SvelteRenderer(MentionList, {
            ...props,
            close: () => {
              component.destroy()
            }
          })
        },
        onUpdate (props: any) {
          component.updateProps(props)
        },
        onKeyDown (props: any) {
          return component.onKeyDown(props)
        },
        onExit () {
          component.destroy()
        }
      }
    }
  }
}
