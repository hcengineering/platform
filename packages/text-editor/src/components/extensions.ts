import Table from '@tiptap/extension-table'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import TableRow from '@tiptap/extension-table-row'

import TaskItem from '@tiptap/extension-task-item'
import TaskList from '@tiptap/extension-task-list'

import { Level } from '@tiptap/extension-heading'
import Highlight from '@tiptap/extension-highlight'
import StarterKit from '@tiptap/starter-kit'

import Gapcursor from '@tiptap/extension-gapcursor'

import { AnyExtension } from '@tiptap/core'
import Link from '@tiptap/extension-link'
import Typography from '@tiptap/extension-typography'
import { CompletionOptions } from '../Completion'
import MentionList from './MentionList.svelte'
import { SvelteRenderer } from './SvelteRenderer'

export const tableExtensions = [
  Table.configure({
    resizable: false,
    HTMLAttributes: {
      class: 'proseTable'
    }
  }),
  TableRow.configure({}),
  TableHeader.configure({}),
  TableCell.configure({})
]

export const taskListExtensions = [
  TaskList,
  TaskItem.configure({
    nested: true,
    HTMLAttributes: {
      class: 'flex flex-grow gap-1 checkbox_style'
    }
  })
]

export const headingLevels: Level[] = [1, 2, 3, 4, 5, 6]

export const defaultExtensions: AnyExtension[] = [
  StarterKit.configure({
    code: {
      HTMLAttributes: {
        class: 'proseCode'
      }
    },
    codeBlock: {
      languageClassPrefix: 'language-',
      exitOnArrowDown: true,
      exitOnTripleEnter: true,
      HTMLAttributes: {
        class: 'proseCodeBlock'
      }
    },
    heading: {
      levels: headingLevels
    }
  }),
  Highlight.configure({
    multicolor: false
  }),
  Typography.configure({}),
  Gapcursor,
  Link.configure({
    openOnClick: true,
    HTMLAttributes: { class: 'cursor-pointer', rel: 'noopener noreferrer', target: '_blank' }
  }),
  ...tableExtensions,
  ...taskListExtensions
]

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
