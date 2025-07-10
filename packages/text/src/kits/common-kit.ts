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

import {
  Blockquote,
  Bold,
  BulletList,
  Document,
  Dropcursor,
  Gapcursor,
  Heading,
  History,
  HorizontalRule,
  Italic,
  Link,
  ListItem,
  OrderedList,
  Paragraph,
  Strike,
  Table,
  TableCell,
  TableHeader,
  TableRow,
  Text,
  TextAlign,
  TextStyle,
  Typography,
  Underline
} from '../tiptapExtensions'

import { ExtensionFactory, extensionKit } from '../kit'
import { BackgroundColor, TextColor } from '../marks/colors'
import { InlineCommentMark } from '../marks/inlineComment'
import { CodeBlockExtension, codeBlockOptions, CommentNode, MarkdownNode, TodoItemNode, TodoListNode } from '../nodes'

import { CodeExtension, codeOptions } from '../marks/code'
import { MermaidExtension, mermaidOptions } from '../nodes/mermaid'

export const CommonKitFactory = (e: ExtensionFactory) =>
  ({
    text: e(Text),
    document: e(Document),
    paragraph: e(Paragraph),

    bold: e(Bold),
    italic: e(Italic),
    strike: e(Strike),

    comment: e(CommentNode),
    markdown: e(MarkdownNode, { HTMLAttributes: { class: 'proseCodeBlock' } }),

    inlineComment: e(InlineCommentMark),

    horizontalRule: e(HorizontalRule),
    heading: e(Heading),
    underline: e(Underline),
    blockquote: e(Blockquote, { HTMLAttributes: { class: 'proseBlockQuote' } }),
    link: e(Link.extend({ inclusive: false }), {
      openOnClick: false,
      HTMLAttributes: { class: 'cursor-pointer', rel: 'noopener noreferrer', target: '_blank' }
    }),
    textAlign: e(TextAlign, {
      types: ['heading', 'paragraph'],
      alignments: ['left', 'center', 'right'],
      defaultAlignment: null
    }),

    typography: e(Typography),

    dropcursor: e(Dropcursor),
    gapcursor: e(Gapcursor),
    history: e(History)
  }) as const

export const CommonKit = extensionKit('common-kit', CommonKitFactory)

export const TextColorStylingKit = extensionKit(
  'text-color-styling',
  (e) =>
    ({
      textStyle: e(TextStyle),
      testColor: e(TextColor),
      backgroundColor: e(BackgroundColor, { types: ['tableCell'] })
    }) as const
)

export const TableKit = extensionKit(
  'table-kit',
  (e) =>
    ({
      table: e(Table, { resizable: false, HTMLAttributes: { class: 'proseTable' } }),
      tableRow: e(TableRow),
      tableHeader: e(TableHeader),
      tableCell: e(TableCell)
    }) as const
)

export const CodeSnippetsKit = extensionKit(
  'code-snippet-kit',
  (e) =>
    ({
      codeBlock: e(CodeBlockExtension, codeBlockOptions),
      codeBlockMermaid: e(MermaidExtension, mermaidOptions),
      codeInline: e(CodeExtension, codeOptions)
    }) as const
)

export const CommonListKitFactory = (e: ExtensionFactory) =>
  ({
    listItem: e(ListItem.extend({ group: 'listItems' })),
    bulletList: e(BulletList.extend({ content: 'listItems+' })),
    orderedList: e(OrderedList.extend({ content: 'listItems+' }))
  }) as const

export const ListKit = extensionKit(
  'list-kit',
  (e) =>
    ({
      ...CommonListKitFactory(e),
      todoItem: e(TodoItemNode),
      todoList: e(TodoListNode)
    }) as const
)
