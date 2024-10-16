//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2022, 2023, 2024 Hardcore Engineering Inc.
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

import { type Class, type Ref } from '@hcengineering/core'
import { type Asset, type IntlString, type Metadata, type Plugin, plugin, type Resource } from '@hcengineering/platform'

import {
  type TextEditorExtensionFactory,
  type RefInputActionItem,
  TextEditorAction,
  CollaboratorType,
  RefInputAction,
  TextEditorInlineCommand,
  InlineShortcutAction
} from './types'

/**
 * @public
 */
export const textEditorId = 'text-editor' as Plugin

export default plugin(textEditorId, {
  class: {
    RefInputActionItem: '' as Ref<Class<RefInputActionItem>>,
    TextEditorExtensionFactory: '' as Ref<Class<TextEditorExtensionFactory>>,
    TextEditorAction: '' as Ref<Class<TextEditorAction>>,
    TextEditorProps: '' as Ref<Class<TextEditorAction>>,
    TextEditorInlineCommand: '' as Ref<Class<TextEditorInlineCommand>>
  },
  metadata: {
    Collaborator: '' as Metadata<CollaboratorType>
  },
  string: {
    TableOfContents: '' as IntlString,
    Suggested: '' as IntlString,
    NoItems: '' as IntlString,
    Attach: '' as IntlString,
    TextStyle: '' as IntlString,
    Emoji: '' as IntlString,
    GIF: '' as IntlString,
    Mention: '' as IntlString,
    Underlined: '' as IntlString,
    EditorPlaceholder: '' as IntlString,
    Edit: '' as IntlString,
    Bold: '' as IntlString,
    Italic: '' as IntlString,
    Strikethrough: '' as IntlString,
    Link: '' as IntlString,
    Save: '' as IntlString,
    OrderedList: '' as IntlString,
    BulletedList: '' as IntlString,
    Blockquote: '' as IntlString,
    Code: '' as IntlString,
    CodeBlock: '' as IntlString,
    Note: '' as IntlString,
    ConfigureNote: '' as IntlString,
    Set: '' as IntlString,
    Update: '' as IntlString,
    Remove: '' as IntlString,
    NotePlaceholder: '' as IntlString,
    SampleText: '' as IntlString,
    Send: '' as IntlString,
    FullDescription: '' as IntlString,
    NoFullDescription: '' as IntlString,
    EnableDiffMode: '' as IntlString,

    AlignCenter: '' as IntlString,
    AlignLeft: '' as IntlString,
    AlignRight: '' as IntlString,
    ViewImage: '' as IntlString,
    ViewOriginal: '' as IntlString,
    Download: '' as IntlString,
    MoreActions: '' as IntlString,

    InsertTable: '' as IntlString,
    AddColumnBefore: '' as IntlString,
    AddColumnAfter: '' as IntlString,
    DeleteColumn: '' as IntlString,
    AddRowBefore: '' as IntlString,
    AddRowAfter: '' as IntlString,
    DeleteRow: '' as IntlString,
    DeleteTable: '' as IntlString,
    Duplicate: '' as IntlString,
    CategoryRow: '' as IntlString,
    CategoryColumn: '' as IntlString,
    Table: '' as IntlString,
    TableOptions: '' as IntlString,
    Width: '' as IntlString,
    Height: '' as IntlString,
    Unset: '' as IntlString,
    Image: '' as IntlString,
    SeparatorLine: '' as IntlString,
    TodoList: '' as IntlString,
    ShortcutsAndCommands: '' as IntlString
  },
  icon: {
    Header1: '' as Asset,
    Header2: '' as Asset,
    Header3: '' as Asset,
    Underline: '' as Asset,
    Strikethrough: '' as Asset,
    Bold: '' as Asset,
    Italic: '' as Asset,
    Link: '' as Asset,
    ListNumber: '' as Asset,
    ListBullet: '' as Asset,
    Quote: '' as Asset,
    Code: '' as Asset,
    CodeBlock: '' as Asset,
    TableProps: '' as Asset,
    AlignLeft: '' as Asset,
    AlignCenter: '' as Asset,
    AlignRight: '' as Asset,
    MoreH: '' as Asset,
    Expand: '' as Asset,
    ScaleOut: '' as Asset,
    Download: '' as Asset,
    Note: '' as Asset
  },
  ids: {
    CommandsPopupAction: '' as Ref<RefInputActionItem>
  },
  action: {
    ShowCommands: '' as Resource<RefInputAction>
  },
  inlineCommand: {
    InsertImage: '' as Ref<TextEditorInlineCommand>,
    InsertTable: '' as Ref<TextEditorInlineCommand>,
    InsertSeparatorLine: '' as Ref<TextEditorInlineCommand>,
    InsertCodeBlock: '' as Ref<TextEditorInlineCommand>,
    InsertTodoList: '' as Ref<TextEditorInlineCommand>
  },
  inlineCommandImpl: {
    InsertImage: '' as Resource<InlineShortcutAction>,
    InsertTable: '' as Resource<InlineShortcutAction>,
    InsertSeparatorLine: '' as Resource<InlineShortcutAction>,
    InsertCodeBlock: '' as Resource<InlineShortcutAction>,
    InsertTodoList: '' as Resource<InlineShortcutAction>
  }
})
