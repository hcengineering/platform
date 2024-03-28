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
import { type Level } from '@tiptap/extension-heading'
import ListKeymap from '@tiptap/extension-list-keymap'
import TableHeader from '@tiptap/extension-table-header'
import TaskItem from '@tiptap/extension-task-item'
import TaskList from '@tiptap/extension-task-list'

import { DefaultKit, type DefaultKitOptions } from './default-kit'

import { CodeBlockExtension, codeBlockOptions } from '@hcengineering/text'
import { CodemarkExtension } from '../components/extension/codemark'
import { NodeUuidExtension } from '../components/extension/nodeUuid'
import { Table, TableCell, TableRow } from '../components/extension/table'

const headingLevels: Level[] = [1, 2, 3]

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

export interface EditorKitOptions extends DefaultKitOptions {
  history?: false
}

export const EditorKit = Extension.create<EditorKitOptions>({
  name: 'defaultKit',

  addExtensions () {
    return [
      DefaultKit.configure({
        ...this.options,
        codeBlock: false,
        heading: {
          levels: headingLevels
        }
      }),
      CodeBlockExtension.configure(codeBlockOptions),
      CodemarkExtension,
      ListKeymap.configure({
        listTypes: [
          {
            itemName: 'listItem',
            wrapperNames: ['bulletList', 'orderedList']
          },
          {
            itemName: 'taskItem',
            wrapperNames: ['taskList']
          },
          {
            itemName: 'todoItem',
            wrapperNames: ['todoList']
          }
        ]
      }),
      NodeUuidExtension,
      ...tableExtensions
      // ...taskListExtensions // Disable since tasks are not working properly now.
    ]
  }
})
