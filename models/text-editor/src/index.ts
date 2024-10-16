//
// Copyright © 2020 Anticrm Platform Contributors.
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

import { DOMAIN_MODEL } from '@hcengineering/core'
import { type Builder, Model } from '@hcengineering/model'
import core, { TDoc } from '@hcengineering/model-core'
import { getEmbeddedLabel, type Asset, type IntlString, type Resource } from '@hcengineering/platform'
import {
  type ExtensionCreator,
  type TextEditorExtensionFactory,
  type RefInputAction,
  type RefInputActionItem,
  type TextEditorAction,
  type TextActionFunction,
  type TextActionVisibleFunction,
  type TextActionActiveFunction,
  type ActiveDescriptor,
  type TogglerDescriptor,
  type TextEditorActionKind,
  type TextEditorInlineCommand,
  type InlineShortcutAction,
  type TextEditorInlineCommandCategory,
  type TextEditorInlineCommandType,
  type InlineCommandAction,
  type RefInputActionDisabledFn,
  type InlineCommandVisibilityTester
} from '@hcengineering/text-editor'
import view from '@hcengineering/view'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { EditorKitOptions } from '@hcengineering/text-editor-resources'
import textEditor from './plugin'

export { textEditorOperation } from './migration'
export { default } from './plugin'
export { textEditorId } from '@hcengineering/text-editor'
export type { RefInputAction, RefInputActionItem }

@Model(textEditor.class.RefInputActionItem, core.class.Doc, DOMAIN_MODEL)
export class TRefInputActionItem extends TDoc implements RefInputActionItem {
  label!: IntlString
  icon!: Asset
  iconProps?: Record<string, any>

  // Query for documents with pattern
  action!: Resource<RefInputAction>
  isDisabledFn?: Resource<RefInputActionDisabledFn>
}

@Model(textEditor.class.TextEditorExtensionFactory, core.class.Doc, DOMAIN_MODEL)
export class TTextEditorExtensionFactory extends TDoc implements TextEditorExtensionFactory {
  index!: number
  create!: Resource<ExtensionCreator>
}

@Model(textEditor.class.TextEditorAction, core.class.Doc, DOMAIN_MODEL)
export class TTextEditorAction extends TDoc implements TextEditorAction {
  kind?: TextEditorActionKind
  action!: TogglerDescriptor | Resource<TextActionFunction>
  visibilityTester?: Resource<TextActionVisibleFunction>
  icon!: Asset
  isActive?: ActiveDescriptor | Resource<TextActionActiveFunction>
  label!: IntlString
  category!: number
  index!: number
}

@Model(textEditor.class.TextEditorInlineCommand, core.class.Doc, DOMAIN_MODEL)
export class TTextEditorInlineCommand extends TDoc implements TextEditorInlineCommand {
  icon!: Asset
  title!: IntlString
  description?: IntlString

  command!: string
  commandTemplate?: string

  category!: TextEditorInlineCommandCategory
  type!: TextEditorInlineCommandType

  action!: Resource<InlineCommandAction> | Resource<InlineShortcutAction>
  visibilityTester?: Resource<InlineCommandVisibilityTester>
}

function createHeaderAction (builder: Builder, level: number): void {
  let icon: Asset
  switch (level) {
    case 1:
      icon = textEditor.icon.Header1
      break
    case 2:
      icon = textEditor.icon.Header2
      break
    case 3:
      icon = textEditor.icon.Header3
      break
    default:
      throw new Error(`Not supported header level: ${level}`)
  }

  builder.createDoc(textEditor.class.TextEditorAction, core.space.Model, {
    action: {
      command: 'toggleHeading',
      params: {
        level
      }
    },
    visibilityTester: textEditor.function.IsEditable,
    icon,
    isActive: {
      name: 'heading',
      params: {
        level
      }
    },
    label: getEmbeddedLabel(`H${level}`),
    category: 10,
    index: 5 * level
  })
}

function createImageAlignmentAction (builder: Builder, align: 'center' | 'left' | 'right'): void {
  let icon: Asset
  let label: IntlString
  let index: number
  switch (align) {
    case 'left':
      icon = textEditor.icon.AlignLeft
      label = textEditor.string.AlignLeft
      index = 5
      break
    case 'center':
      icon = textEditor.icon.AlignCenter
      label = textEditor.string.AlignCenter
      index = 10
      break
    case 'right':
      icon = textEditor.icon.AlignRight
      label = textEditor.string.AlignRight
      index = 15
      break
  }

  builder.createDoc(textEditor.class.TextEditorAction, core.space.Model, {
    kind: 'image',
    action: {
      command: 'setImageAlignment',
      params: {
        align
      }
    },
    visibilityTester: textEditor.function.IsEditable,
    icon,
    isActive: {
      name: 'image',
      params: {
        align
      }
    },
    label,
    category: 80,
    index
  })
}

export function createModel (builder: Builder): void {
  builder.createModel(TRefInputActionItem, TTextEditorExtensionFactory, TTextEditorAction, TTextEditorInlineCommand)

  createHeaderAction(builder, 1)
  createHeaderAction(builder, 2)
  createHeaderAction(builder, 3)

  builder.createDoc(textEditor.class.TextEditorAction, core.space.Model, {
    action: {
      command: 'toggleBold'
    },
    icon: textEditor.icon.Bold,
    visibilityTester: textEditor.function.IsEditable,
    isActive: {
      name: 'bold'
    },
    label: textEditor.string.Bold,
    category: 20,
    index: 5
  })

  // Decoration category
  builder.createDoc(textEditor.class.TextEditorAction, core.space.Model, {
    action: {
      command: 'toggleItalic'
    },
    icon: textEditor.icon.Italic,
    visibilityTester: textEditor.function.IsEditable,
    isActive: {
      name: 'italic'
    },
    label: textEditor.string.Italic,
    category: 20,
    index: 10
  })

  builder.createDoc(textEditor.class.TextEditorAction, core.space.Model, {
    action: {
      command: 'toggleStrike'
    },
    icon: textEditor.icon.Strikethrough,
    visibilityTester: textEditor.function.IsEditable,
    isActive: {
      name: 'strike'
    },
    label: textEditor.string.Strikethrough,
    category: 20,
    index: 15
  })

  builder.createDoc(textEditor.class.TextEditorAction, core.space.Model, {
    action: {
      command: 'toggleUnderline'
    },
    icon: textEditor.icon.Underline,
    visibilityTester: textEditor.function.IsEditable,
    isActive: {
      name: 'underline'
    },
    label: textEditor.string.Underlined,
    category: 20,
    index: 20
  })

  // Link category
  builder.createDoc(textEditor.class.TextEditorAction, core.space.Model, {
    action: textEditor.function.FormatLink,
    icon: textEditor.icon.Link,
    visibilityTester: textEditor.function.IsEditable,
    isActive: {
      name: 'link'
    },
    label: textEditor.string.Link,
    category: 30,
    index: 5
  })

  // List category
  builder.createDoc(textEditor.class.TextEditorAction, core.space.Model, {
    action: {
      command: 'toggleOrderedList'
    },
    icon: textEditor.icon.ListNumber,
    visibilityTester: textEditor.function.IsEditable,
    isActive: {
      name: 'orderedList'
    },
    label: textEditor.string.OrderedList,
    category: 40,
    index: 5
  })

  builder.createDoc(textEditor.class.TextEditorAction, core.space.Model, {
    action: {
      command: 'toggleBulletList'
    },
    icon: textEditor.icon.ListBullet,
    visibilityTester: textEditor.function.IsEditable,
    isActive: {
      name: 'bulletList'
    },
    label: textEditor.string.BulletedList,
    category: 40,
    index: 10
  })

  // Quote category
  builder.createDoc(textEditor.class.TextEditorAction, core.space.Model, {
    action: {
      command: 'toggleBlockquote'
    },
    icon: textEditor.icon.Quote,
    visibilityTester: textEditor.function.IsEditable,
    isActive: {
      name: 'blockquote'
    },
    label: textEditor.string.Blockquote,
    category: 50,
    index: 5
  })

  // Code category
  builder.createDoc(textEditor.class.TextEditorAction, core.space.Model, {
    action: {
      command: 'toggleCode'
    },
    icon: textEditor.icon.Code,
    visibilityTester: textEditor.function.IsEditable,
    isActive: {
      name: 'code'
    },
    label: textEditor.string.Code,
    category: 60,
    index: 5
  })

  builder.createDoc(textEditor.class.TextEditorAction, core.space.Model, {
    action: {
      command: 'toggleCodeBlock'
    },
    icon: textEditor.icon.CodeBlock,
    visibilityTester: textEditor.function.IsEditable,
    isActive: {
      name: 'codeBlock'
    },
    label: textEditor.string.CodeBlock,
    category: 60,
    index: 10
  })

  // Table category
  builder.createDoc(textEditor.class.TextEditorAction, core.space.Model, {
    action: textEditor.function.OpenTableOptions,
    icon: textEditor.icon.TableProps,
    visibilityTester: textEditor.function.IsEditableTableActive,
    label: textEditor.string.TableOptions,
    category: 70,
    index: 5
  })

  // Image align category
  createImageAlignmentAction(builder, 'left')
  createImageAlignmentAction(builder, 'center')
  createImageAlignmentAction(builder, 'right')

  // Image view category
  builder.createDoc(textEditor.class.TextEditorAction, core.space.Model, {
    kind: 'image',
    action: textEditor.function.OpenImage,
    icon: textEditor.icon.ScaleOut,
    label: textEditor.string.ViewImage,
    category: 90,
    index: 5
  })

  builder.createDoc(textEditor.class.TextEditorAction, core.space.Model, {
    kind: 'image',
    action: textEditor.function.ExpandImage,
    icon: textEditor.icon.Expand,
    label: textEditor.string.ViewOriginal,
    category: 90,
    index: 10
  })

  builder.createDoc(textEditor.class.TextEditorAction, core.space.Model, {
    kind: 'image',
    action: textEditor.function.DownloadImage,
    icon: textEditor.icon.Download,
    label: textEditor.string.Download,
    category: 90,
    index: 15
  })

  builder.createDoc(textEditor.class.TextEditorAction, core.space.Model, {
    kind: 'image',
    action: textEditor.function.MoreImageActions,
    visibilityTester: textEditor.function.IsEditable,
    icon: textEditor.icon.MoreH,
    label: textEditor.string.MoreActions,
    category: 100,
    index: 5
  })

  builder.createDoc(textEditor.class.TextEditorAction, core.space.Model, {
    action: textEditor.function.ConfigureNote,
    icon: textEditor.icon.Note,
    visibilityTester: textEditor.function.IsEditableNote,
    isActive: {
      name: 'note'
    },
    label: textEditor.string.Note,
    category: 110,
    index: 5
  })

  builder.createDoc(
    textEditor.class.RefInputActionItem,
    core.space.Model,
    {
      label: textEditor.string.ShortcutsAndCommands,
      icon: view.icon.Slash,
      iconProps: {
        size: 'small'
      },
      action: textEditor.action.ShowCommands,
      order: 6000,
      isDisabledFn: textEditor.function.DisableInlineCommands
    },
    textEditor.ids.CommandsPopupAction
  )

  builder.createDoc(
    textEditor.class.TextEditorInlineCommand,
    core.space.Model,
    {
      command: 'image',
      title: textEditor.string.Image,
      icon: view.icon.Image,
      category: 'editor',
      type: 'shortcut',
      action: textEditor.inlineCommandImpl.InsertImage
    },
    textEditor.inlineCommand.InsertImage
  )

  builder.createDoc(
    textEditor.class.TextEditorInlineCommand,
    core.space.Model,
    {
      command: 'table',
      title: textEditor.string.Table,
      icon: view.icon.Table2,
      category: 'editor',
      type: 'shortcut',
      action: textEditor.inlineCommandImpl.InsertTable
    },
    textEditor.inlineCommand.InsertTable
  )

  builder.createDoc(
    textEditor.class.TextEditorInlineCommand,
    core.space.Model,
    {
      command: 'code-block',
      title: textEditor.string.CodeBlock,
      icon: view.icon.CodeBlock,
      category: 'editor',
      type: 'shortcut',
      action: textEditor.inlineCommandImpl.InsertCodeBlock
    },
    textEditor.inlineCommand.InsertCodeBlock
  )

  builder.createDoc(
    textEditor.class.TextEditorInlineCommand,
    core.space.Model,
    {
      command: 'separator-line',
      title: textEditor.string.SeparatorLine,
      icon: view.icon.SeparatorLine,
      category: 'editor',
      type: 'shortcut',
      action: textEditor.inlineCommandImpl.InsertSeparatorLine
    },
    textEditor.inlineCommand.InsertSeparatorLine
  )

  builder.createDoc(
    textEditor.class.TextEditorInlineCommand,
    core.space.Model,
    {
      command: 'todo-list',
      title: textEditor.string.TodoList,
      icon: view.icon.TodoList,
      category: 'editor',
      type: 'shortcut',
      action: textEditor.inlineCommandImpl.InsertTodoList
    },
    textEditor.inlineCommand.InsertTodoList
  )
}
