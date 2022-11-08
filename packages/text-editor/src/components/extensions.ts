import Table from '@tiptap/extension-table'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import TableRow from '@tiptap/extension-table-row'

import TaskItem from '@tiptap/extension-task-item'
import TaskList from '@tiptap/extension-task-list'

import Heading, { Level } from '@tiptap/extension-heading'
import Highlight from '@tiptap/extension-highlight'
import StarterKit from '@tiptap/starter-kit'

import TipTapCodeBlock from '@tiptap/extension-code-block'
import Gapcursor from '@tiptap/extension-gapcursor'

import Link from '@tiptap/extension-link'

export const tableExtensions = [
  Table.configure({
    resizable: false,
    HTMLAttributes: {
      class: 'antiTable editable '
    }
  }),
  TableRow.configure({
    HTMLAttributes: {
      class: 'antiTable-body__row'
    }
  }),
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

export const defaultExtensions = [
  StarterKit,
  Highlight.configure({
    multicolor: false
  }),
  TipTapCodeBlock.configure({
    languageClassPrefix: 'language-',
    exitOnArrowDown: true,
    exitOnTripleEnter: true,
    HTMLAttributes: {
      class: 'code-block'
    }
  }),
  Gapcursor,
  Heading.configure({
    levels: headingLevels
  }),
  Link.configure({ openOnClick: false }),
  ...tableExtensions,
  ...taskListExtensions
]
