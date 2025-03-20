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
  type TextEditorActionKind
} from '@hcengineering/text-editor'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { EditorKitOptions } from '@hcengineering/text-editor-resources/src/kits/editor-kit'
import textEditor from './plugin'

export { textEditorOperation } from './migration'
export { default } from './plugin'
export { textEditorId } from '@hcengineering/text-editor'
export type { RefInputAction, RefInputActionItem }

@Model(textEditor.class.RefInputActionItem, core.class.Doc, DOMAIN_MODEL)
export class TRefInputActionItem extends TDoc implements RefInputActionItem {
  label!: IntlString
  icon!: Asset

  // Query for documents with pattern
  action!: Resource<RefInputAction>
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

function createTextAlignmentAction (builder: Builder, align: 'center' | 'left' | 'right'): void {
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
    kind: 'text',
    action: {
      command: 'setTextAlign',
      params: align
    },
    visibilityTester: textEditor.function.IsEditable,
    icon,
    label,
    category: 45,
    index
  })
}

export function createModel (builder: Builder): void {
  builder.createModel(TRefInputActionItem, TTextEditorExtensionFactory, TTextEditorAction)

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

  builder.createDoc(textEditor.class.TextEditorAction, core.space.Model, {
    action: textEditor.function.SetTextColor,
    icon: textEditor.icon.TextStyle,
    visibilityTester: textEditor.function.IsTextStylingEnabled,
    isActive: {
      name: 'textStyle'
    },
    label: textEditor.string.SetTextColor,
    category: 20,
    index: 25
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

  builder.createDoc(textEditor.class.TextEditorAction, core.space.Model, {
    action: {
      command: 'toggleTaskList'
    },
    icon: textEditor.icon.ListTodo,
    visibilityTester: textEditor.function.IsEditable,
    isActive: {
      name: 'todoList'
    },
    label: textEditor.string.TodoList,
    category: 40,
    index: 15
  })

  // Text align category
  createTextAlignmentAction(builder, 'left')
  createTextAlignmentAction(builder, 'center')
  createTextAlignmentAction(builder, 'right')

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

  // Table cell category
  builder.createDoc(textEditor.class.TextEditorAction, core.space.Model, {
    kind: 'table',
    action: textEditor.function.SetBackgroundColor,
    icon: textEditor.icon.Brush,
    visibilityTester: textEditor.function.IsTableToolbarContext,
    label: textEditor.string.SetCellHighlightColor,
    category: 65,
    index: 5
  })

  // Table category
  builder.createDoc(textEditor.class.TextEditorAction, core.space.Model, {
    kind: 'table',
    action: textEditor.function.SelectTable,
    icon: textEditor.icon.SelectTable,
    visibilityTester: textEditor.function.IsTableToolbarContext,
    label: textEditor.string.SelectTable,
    category: 70,
    index: 15
  })

  builder.createDoc(textEditor.class.TextEditorAction, core.space.Model, {
    kind: 'table',
    action: textEditor.function.OpenTableOptions,
    icon: textEditor.icon.TableProps,
    visibilityTester: textEditor.function.IsTableToolbarContext,
    label: textEditor.string.TableOptions,
    category: 70,
    index: 20
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

  builder.createDoc(textEditor.class.TextEditorAction, core.space.Model, {
    action: textEditor.function.CreateInlineComment,
    icon: textEditor.icon.Comment,
    visibilityTester: textEditor.function.ShouldShowCreateInlineCommentAction,
    isActive: {
      name: 'inlineComment'
    },
    label: textEditor.string.Comment,
    category: 110,
    index: 10
  })
}
