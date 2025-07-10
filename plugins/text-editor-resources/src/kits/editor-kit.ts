//
// Copyright © 2023, 2024 Hardcore Engineering Inc.
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
import { type Class, type Doc, type Ref, type Space } from '@hcengineering/core'
import { getResource } from '@hcengineering/platform'
import { getClient } from '@hcengineering/presentation'
import {
  CodeExtension,
  codeOptions,
  CommentNode,
  CommonKitFactory,
  CommonListKitFactory,
  extensionKit,
  mergeKitOptions,
  TextColorStylingKit
} from '@hcengineering/text'
import textEditor, { type ActionContext, type ExtensionCreator, type TextEditorMode } from '@hcengineering/text-editor'
import { type AnyExtension, Extension } from '@tiptap/core'
import TableHeader from '@tiptap/extension-table-header'
import 'prosemirror-codemark/dist/codemark.css'

import Collaboration from '@tiptap/extension-collaboration'
import CollaborationCursor from '@tiptap/extension-collaboration-cursor'
import Placeholder from '@tiptap/extension-placeholder'
import { CodeBlockHighlighExtension, codeBlockHighlightOptions } from '../components/extension/codeSnippets/codeblock'
import { MermaidExtension, mermaidOptions } from '../components/extension/codeSnippets/mermaid'
import { DrawingBoardExtension } from '../components/extension/drawingBoard'
import { EmbedNode } from '../components/extension/embed/embed'
import { defaultDriveEmbedOptions, DriveEmbedProvider } from '../components/extension/embed/providers/drive'
import { defaultYoutubeEmbedUrlOptions, YoutubeEmbedProvider } from '../components/extension/embed/providers/youtube'
import { EmojiExtension } from '../components/extension/emoji'
import { FileExtension } from '../components/extension/fileExt'
import { HardBreakExtension } from '../components/extension/hardBreak'
import { EditableExtension } from '../components/extension/hooks/editable'
import { FocusExtension } from '../components/extension/hooks/focus'
import { IsEmptyContentExtension } from '../components/extension/hooks/isEmptyContent'
import { ImageExtension } from '../components/extension/imageExt'
import { InlineCommandsExtension } from '../components/extension/inlineCommands'
import { InlineCommentCollaborationExtension } from '../components/extension/inlineComment'
import { LeftMenuExtension } from '../components/extension/leftMenu'
import { NoteExtension } from '../components/extension/note'
import { QMSInlineCommentExtension } from '../components/extension/qms/qmsInlineComment'
import { QMSInlineCommentMark } from '../components/extension/qms/qmsInlineCommentMark'
import { referenceConfig, ReferenceExtension } from '../components/extension/reference'
import { FileUploadExtension } from '../components/extension/shortcuts/fileUpload'
import { ImageUploadExtension } from '../components/extension/shortcuts/imageUpload'
import { IndentExtension, indentExtensionOptions } from '../components/extension/shortcuts/indent'
import { LinkKeymapExtension } from '../components/extension/shortcuts/linkKeymap'
import { ParagraphKeymapExtension } from '../components/extension/shortcuts/paragraphKeymap'
import { SmartPasteExtension } from '../components/extension/shortcuts/smartPaste'
import { HandleSubmitExtension } from '../components/extension/shortcuts/handleSubmit'
import { Table, TableCell, TableRow } from '../components/extension/table'
import { ToCExtension } from '../components/extension/toc'
import { TodoItemExtension, TodoListExtension } from '../components/extension/todo/todo'
import { ToolbarExtension } from '../components/extension/toolbar/toolbar'
import { ListKeymapExtension } from '../components/extension/shortcuts/listKeymap'

export interface EditorKitContext {
  mode?: 'full' | 'compact'

  objectId?: Ref<Doc>
  objectClass?: Ref<Class<Doc>>
  objectSpace?: Ref<Space>
}

export type EditorKitOptions = EditorKitContext & (typeof StaticEditorKit)['options']

const StaticEditorKit = extensionKit(
  'static-kit',
  (e, context: EditorKitContext) =>
    ({
      ...CommonKitFactory(e),

      shortcuts: e(subKits.shortcuts, context), // needs to be loaded as early as possible to override the default behavior

      // ===========================================================================================
      // Extensions and kits with separate / shortened implementations in the server-side editor kit
      // See file://./../../../../packages/text/src/kits/server-kit.ts
      // =============================================================

      lists: e(subKits.lists, context),
      tables: e(subKits.tables),
      codeSnippets: e(subKits.codeSnippets),
      textColorStyling: e(TextColorStylingKit, context.mode === 'full'),
      hardBreak: e(HardBreakExtension, { shortcuts: context.mode }),
      reference: e(ReferenceExtension, referenceConfig),
      file: e(FileExtension, { inline: true }),
      image: e(ImageExtension),
      emoji: e(EmojiExtension),
      drawingBoard: e(DrawingBoardExtension),
      embed: e(
        EmbedNode,
        context.mode === 'full' && {
          providers: [YoutubeEmbedProvider(defaultYoutubeEmbedUrlOptions), DriveEmbedProvider(defaultDriveEmbedOptions)]
        }
      ),
      inlineNote: e(NoteExtension, context.mode === 'full'), // Semi-deprecated, should be removed in the future
      commentNode: e(CommentNode, false),

      // =====================================================
      // Extensions and kits designed for client-side use only
      // =====================================================

      toolbar: e(ToolbarExtension, {
        providers: [],
        context: getActionContext(context)
      }),
      toc: e(ToCExtension, false),
      leftMenu: e(LeftMenuExtension, false),
      inlineCommands: e(InlineCommandsExtension, false),
      placeholder: e(Placeholder, false),

      collaboration: e(subKits.collaboration, false),
      hooks: e(subKits.hooks), // Semi-deprecated, should be removed in the future
      qms: e(subKits.qms, false) // Semi-deprecated, should be removed in the future
    }) as const
)

const subKits = {
  lists: extensionKit(
    'list-kit',
    (e, context: EditorKitContext) =>
      ({
        ...CommonListKitFactory(e),
        todoItem: e(TodoItemExtension, context.mode === 'full' && { context: getActionContext(context) }),
        todoList: e(TodoListExtension, context.mode === 'full')
      }) as const
  ),

  tables: extensionKit(
    'table-kit',
    (e) =>
      ({
        table: e(Table, { resizable: true, HTMLAttributes: { class: 'proseTable' } }),
        tableRow: e(TableRow),
        tableHeader: e(TableHeader),
        tableCell: e(TableCell)
      }) as const
  ),

  codeSnippets: extensionKit(
    'code-snippets-kit',
    (e) =>
      ({
        codeBlock: e(CodeBlockHighlighExtension, codeBlockHighlightOptions),
        codeInline: e(CodeExtension, codeOptions),
        codeBlockMermaid: e(MermaidExtension, mermaidOptions)
      }) as const
  ),

  collaboration: extensionKit(
    'collaboration-kit',
    (e) =>
      ({
        collaboration: e(Collaboration),
        collaborationCursor: e(CollaborationCursor),
        inlineComments: e(InlineCommentCollaborationExtension)
      }) as const
  ),

  shortcuts: extensionKit(
    'shortcuts-kit',
    (e, context: EditorKitContext) =>
      ({
        fileUpload: e(FileUploadExtension, false),
        imageUpload: e(ImageUploadExtension, false),
        submit: e(HandleSubmitExtension, { useModKey: context.mode === 'full' }),
        indent: e(IndentExtension, indentExtensionOptions),
        smartPaste: e(SmartPasteExtension),
        paragraphKeymap: e(ParagraphKeymapExtension, context.mode === 'compact'),
        linkKeymap: e(LinkKeymapExtension),
        listKeymap: e(ListKeymapExtension, {
          listTypes: [
            { itemName: 'listItem', wrapperNames: ['bulletList', 'orderedList'] },
            { itemName: 'taskItem', wrapperNames: ['taskList'] },
            { itemName: 'todoItem', wrapperNames: ['todoList'] }
          ]
        })
      }) as const
  ),

  // Semi-deprecated, should be removed in the future
  hooks: extensionKit(
    'hooks-kit',
    (e) =>
      ({
        emptyContent: e(IsEmptyContentExtension, false),
        focus: e(FocusExtension, false),
        editable: e(EditableExtension)
      }) as const
  ),

  // Semi-deprecated, should be removed in the future
  qms: extensionKit(
    'qms-kit',
    (e) =>
      ({
        qmsInlineCommentMark: e(QMSInlineCommentMark),
        qmsInlineComment: e(QMSInlineCommentExtension)
      }) as const
  )
}

async function getModelKitFactories (): Promise<ExtensionCreator[]> {
  const client = getClient()
  const extensionFactories = client.getModel().findAllSync(textEditor.class.TextEditorExtensionFactory, {})

  const factories = await Promise.all(
    extensionFactories.map(async ({ index, create }) => {
      return [index, await getResource(create)] as const
    })
  )

  return factories.sort((a, b) => a[0] - b[0]).map(([_, ext]) => ext)
}

async function buildEditorKit (): Promise<Extension<EditorKitOptions, any>> {
  const modelKitFactories = await getModelKitFactories()

  return Extension.create<EditorKitOptions>({
    name: 'editorKit',

    addExtensions () {
      const mode: TextEditorMode = this.options.mode ?? 'full'
      const modelKit: AnyExtension[] = modelKitFactories
        .map((factory) =>
          factory(mode, {
            objectId: this.options.objectId,
            objectClass: this.options.objectClass,
            objectSpace: this.options.objectSpace
          })
        )
        .filter((e) => e != null)

      const extensions = [StaticEditorKit.configure(this.options), ...modelKit]
      return extensions
    }
  })
}

let editorKitPromise: Promise<Extension<EditorKitOptions, any>>

export async function getEditorKit (
  ...options: Array<Partial<EditorKitOptions>>
): Promise<Extension<EditorKitOptions, any>> {
  if (editorKitPromise === undefined) {
    editorKitPromise = buildEditorKit()
  }

  const kit = await editorKitPromise
  if ((options ?? []).length < 1) return kit

  let newOptions: Partial<EditorKitOptions> = {
    mode: 'full'
  }
  for (const e of options) {
    newOptions = mergeKitOptions(newOptions, e)
  }
  return kit.configure(newOptions)
}

function getActionContext (context: EditorKitContext): ActionContext {
  return {
    mode: context.mode ?? 'full',
    objectId: context.objectId,
    objectClass: context.objectClass,
    objectSpace: context.objectSpace
  }
}
