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

/** @public */
export enum MarkupNodeType {
  doc = 'doc',
  paragraph = 'paragraph',
  blockquote = 'blockquote',
  horizontal_rule = 'horizontalRule',
  heading = 'heading',
  code_block = 'codeBlock',
  text = 'text',
  image = 'image',
  file = 'file',
  reference = 'reference',
  hard_break = 'hardBreak',
  ordered_list = 'orderedList',
  bullet_list = 'bulletList',
  list_item = 'listItem',
  taskList = 'taskList',
  taskItem = 'taskItem',
  todoList = 'todoList',
  todoItem = 'todoItem',
  subLink = 'subLink',
  table = 'table',
  table_row = 'tableRow',
  table_cell = 'tableCell',
  table_header = 'tableHeader',
  comment = 'comment'
}

/** @public */
export enum MarkupMarkType {
  link = 'link',
  em = 'italic',
  bold = 'bold',
  code = 'code',
  strike = 'strike',
  underline = 'underline'
}

/** @public */
export interface MarkupMark {
  type: MarkupMarkType
  attrs: Record<string, any> // A map of attributes
}

export type AttrValue = string | number | boolean
export type Attrs = Record<string, AttrValue>

/** @public */
export interface MarkupNode {
  type: MarkupNodeType
  content?: MarkupNode[] // A list of child nodes
  marks?: MarkupMark[]
  attrs?: Attrs
  text?: string
}

/** @public */
export function emptyMarkupNode (): MarkupNode {
  return {
    type: MarkupNodeType.doc,
    content: [{ type: MarkupNodeType.paragraph, content: [] }]
  }
}

/** @public */
export interface LinkMark extends MarkupMark {
  href: string
  title: string
}

/** @public */
export interface ReferenceMarkupNode extends MarkupNode {
  type: MarkupNodeType.reference
  attrs: { id: string, label: string, objectclass: string }
}
