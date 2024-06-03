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

import { getBlobRef } from '@hcengineering/presentation'
import { CodeBlockExtension, codeBlockOptions } from '@hcengineering/text'
import { CodemarkExtension } from '../components/extension/codemark'
import { FileExtension, type FileOptions } from '../components/extension/fileExt'
import { ImageExtension, type ImageOptions } from '../components/extension/imageExt'
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
  file?: Partial<FileOptions> | false
  image?: Partial<ImageOptions> | false
}

export const EditorKit = Extension.create<EditorKitOptions>({
  name: 'defaultKit',

  addExtensions () {
    return [
      // have to be before default kit to ensure Tab works properly inside tables
      ...tableExtensions,
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
      ...(this.options.file !== false
        ? [
            FileExtension.configure({
              inline: true,
              ...this.options.file
            })
          ]
        : []),
      ...(this.options.image !== false
        ? [
            ImageExtension.configure({
              inline: true,
              loadingImgSrc:
                'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4NCjxzdmcgd2lkdGg9IjMycHgiIGhlaWdodD0iMzJweCIgdmlld0JveD0iMCAwIDE2IDE2IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPg0KICAgIDxwYXRoIGQ9Im0gNCAxIGMgLTEuNjQ0NTMxIDAgLTMgMS4zNTU0NjkgLTMgMyB2IDEgaCAxIHYgLTEgYyAwIC0xLjEwOTM3NSAwLjg5MDYyNSAtMiAyIC0yIGggMSB2IC0xIHogbSAyIDAgdiAxIGggNCB2IC0xIHogbSA1IDAgdiAxIGggMSBjIDEuMTA5Mzc1IDAgMiAwLjg5MDYyNSAyIDIgdiAxIGggMSB2IC0xIGMgMCAtMS42NDQ1MzEgLTEuMzU1NDY5IC0zIC0zIC0zIHogbSAtNSA0IGMgLTAuNTUwNzgxIDAgLTEgMC40NDkyMTkgLTEgMSBzIDAuNDQ5MjE5IDEgMSAxIHMgMSAtMC40NDkyMTkgMSAtMSBzIC0wLjQ0OTIxOSAtMSAtMSAtMSB6IG0gLTUgMSB2IDQgaCAxIHYgLTQgeiBtIDEzIDAgdiA0IGggMSB2IC00IHogbSAtNC41IDIgbCAtMiAyIGwgLTEuNSAtMSBsIC0yIDIgdiAwLjUgYyAwIDAuNSAwLjUgMC41IDAuNSAwLjUgaCA3IHMgMC40NzI2NTYgLTAuMDM1MTU2IDAuNSAtMC41IHYgLTEgeiBtIC04LjUgMyB2IDEgYyAwIDEuNjQ0NTMxIDEuMzU1NDY5IDMgMyAzIGggMSB2IC0xIGggLTEgYyAtMS4xMDkzNzUgMCAtMiAtMC44OTA2MjUgLTIgLTIgdiAtMSB6IG0gMTMgMCB2IDEgYyAwIDEuMTA5Mzc1IC0wLjg5MDYyNSAyIC0yIDIgaCAtMSB2IDEgaCAxIGMgMS42NDQ1MzEgMCAzIC0xLjM1NTQ2OSAzIC0zIHYgLTEgeiBtIC04IDMgdiAxIGggNCB2IC0xIHogbSAwIDAiIGZpbGw9IiMyZTM0MzQiIGZpbGwtb3BhY2l0eT0iMC4zNDkwMiIvPg0KPC9zdmc+DQo=',
              getBlobRef: async (file, name, size) => await getBlobRef(undefined, file, name, size),
              ...this.options.image
            })
          ]
        : [])
      // ...taskListExtensions // Disable since tasks are not working properly now.
    ]
  }
})
