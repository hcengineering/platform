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
import { getBlobRef, getClient } from '@hcengineering/presentation'
import { BackgroundColor, CodeExtension, codeOptions, TextColor, TextStyle } from '@hcengineering/text'
import textEditor, { type ActionContext, type ExtensionCreator, type TextEditorMode } from '@hcengineering/text-editor'
import { type AnyExtension, type Editor, Extension } from '@tiptap/core'
import { type Level } from '@tiptap/extension-heading'
import TableHeader from '@tiptap/extension-table-header'
import 'prosemirror-codemark/dist/codemark.css'

import { EditableExtension } from '../components/extension/editable'
import { CodeBlockHighlighExtension, codeBlockHighlightOptions } from '../components/extension/codeblock'
import { NoteExtension, type NoteOptions } from '../components/extension/note'
import { FileExtension, type FileOptions } from '../components/extension/fileExt'
import { HardBreakExtension } from '../components/extension/hardBreak'
import { ImageExtension, type ImageOptions } from '../components/extension/imageExt'
import { InlineToolbarExtension } from '../components/extension/inlineToolbar'
import { ListKeymapExtension } from '../components/extension/listkeymap'
import { NodeUuidExtension } from '../components/extension/nodeUuid'
import { ParagraphExtension } from '../components/extension/paragraph'
import { SubmitExtension, type SubmitOptions } from '../components/extension/submit'
import { Table, TableCell, TableRow } from '../components/extension/table'
import { DefaultKit, type DefaultKitOptions } from './default-kit'
import { MermaidExtension, type MermaidOptions, mermaidOptions } from '../components/extension/mermaid'
import { DrawingBoardExtension, type DrawingBoardOptions } from '../components/extension/drawingBoard'
import { type IndendOptions, IndentExtension, indentExtensionOptions } from '../components/extension/indent'
import TextAlign, { type TextAlignOptions } from '@tiptap/extension-text-align'

export interface EditorKitOptions extends DefaultKitOptions {
  history?: false
  file?: Partial<FileOptions> | false
  image?:
  | (Partial<ImageOptions> & {
    toolbar?: {
      element: HTMLElement
      boundary?: HTMLElement
      appendTo?: HTMLElement | (() => HTMLElement)
      isHidden?: () => boolean
    }
  })
  | false
  drawingBoard?: DrawingBoardOptions | false
  mermaid?: MermaidOptions | false
  indent?: IndendOptions | false
  textAlign?: TextAlignOptions | false
  mode?: 'full' | 'compact'
  note?: NoteOptions | false
  submit?: SubmitOptions | false
  objectId?: Ref<Doc>
  objectClass?: Ref<Class<Doc>>
  objectSpace?: Ref<Space>
  toolbar?:
  | {
    element?: HTMLElement
    boundary?: HTMLElement
    appendTo?: HTMLElement | (() => HTMLElement)
    isHidden?: () => boolean
  }
  | false
}

const headingLevels: Level[] = [1, 2, 3]

export const tableKitExtensions: KitExtension[] = [
  [
    10,
    Table.configure({
      resizable: true,
      HTMLAttributes: {
        class: 'proseTable'
      }
    })
  ],
  [20, TableRow.configure({})],
  [30, TableHeader.configure({})],
  [40, TableCell.configure({})]
]

function getTippyOptions (
  boundary?: HTMLElement,
  appendTo?: HTMLElement | (() => HTMLElement),
  placement?: string,
  offset?: number[]
): any {
  return {
    zIndex: 100000,
    placement,
    offset,
    popperOptions: {
      modifiers: [
        {
          name: 'preventOverflow',
          options: {
            boundary,
            padding: 8,
            altAxis: true,
            tether: false
          }
        }
      ]
    },
    ...(appendTo !== undefined ? { appendTo } : {})
  }
}

/**
 * KitExtensionCreator is a tuple of an index and an ExtensionCreator.
 */
export type KitExtensionCreator = [number, ExtensionCreator]
export type KitExtension = [number, AnyExtension]

async function getKitExtensionCreators (): Promise<KitExtensionCreator[]> {
  const client = getClient()
  const extensionFactories = client.getModel().findAllSync(textEditor.class.TextEditorExtensionFactory, {})

  return await Promise.all(
    extensionFactories.map(async ({ index, create }) => {
      return [index, await getResource(create)]
    })
  )
}

let editorKitPromise: Promise<Extension<EditorKitOptions, any>>

export async function getEditorKit (): Promise<Extension<EditorKitOptions, any>> {
  if (editorKitPromise === undefined) {
    editorKitPromise = buildEditorKit()
  }

  return await editorKitPromise
}

async function buildEditorKit (): Promise<Extension<EditorKitOptions, any>> {
  return await new Promise<Extension<EditorKitOptions, any>>((resolve, reject) => {
    getKitExtensionCreators()
      .then((kitExtensionCreators) => {
        resolve(
          Extension.create<EditorKitOptions>({
            name: 'defaultKit',

            addExtensions () {
              const mode: TextEditorMode = this.options.mode ?? 'full'
              const modelKitExtensions: KitExtension[] = kitExtensionCreators
                .map(
                  ([idx, createExtension]) =>
                    [
                      idx,
                      createExtension(mode, {
                        objectId: this.options.objectId,
                        objectClass: this.options.objectClass,
                        objectSpace: this.options.objectSpace
                      })
                    ] as KitExtension
                )
                .filter(([_, ext]) => ext != null)

              const staticKitExtensions: KitExtension[] = [
                [
                  100,
                  DefaultKit.configure({
                    ...this.options,
                    code: false,
                    codeBlock: false,
                    hardBreak: false,
                    heading: {
                      levels: headingLevels
                    }
                  })
                ],
                [110, EditableExtension],
                [200, CodeBlockHighlighExtension.configure(codeBlockHighlightOptions)],
                [210, CodeExtension.configure(codeOptions)],
                [220, HardBreakExtension.configure({ shortcuts: mode })]
              ]

              if (this.options.submit !== false) {
                staticKitExtensions.push([
                  300,
                  SubmitExtension.configure({
                    useModKey: mode === 'full',
                    ...this.options.submit
                  })
                ])
              }

              if (mode === 'compact') {
                staticKitExtensions.push([400, ParagraphExtension.configure()])
              }

              if (mode === 'full') {
                staticKitExtensions.push([410, TextStyle.configure({})])
                staticKitExtensions.push([420, TextColor.configure({})])
                staticKitExtensions.push([430, BackgroundColor.configure({ types: ['tableCell'] })])
              }

              staticKitExtensions.push([
                500,
                ListKeymapExtension.configure({
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
                })
              ])

              staticKitExtensions.push([600, NodeUuidExtension])

              if (this.options.file !== false) {
                staticKitExtensions.push([
                  700,
                  FileExtension.configure({
                    inline: true,
                    ...this.options.file
                  })
                ])
              }

              if (this.options.image !== false) {
                const imageOptions: ImageOptions = {
                  inline: true,
                  loadingImgSrc:
                    'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4NCjxzdmcgd2lkdGg9IjMycHgiIGhlaWdodD0iMzJweCIgdmlld0JveD0iMCAwIDE2IDE2IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPg0KICAgIDxwYXRoIGQ9Im0gNCAxIGMgLTEuNjQ0NTMxIDAgLTMgMS4zNTU0NjkgLTMgMyB2IDEgaCAxIHYgLTEgYyAwIC0xLjEwOTM3NSAwLjg5MDYyNSAtMiAyIC0yIGggMSB2IC0xIHogbSAyIDAgdiAxIGggNCB2IC0xIHogbSA1IDAgdiAxIGggMSBjIDEuMTA5Mzc1IDAgMiAwLjg5MDYyNSAyIDIgdiAxIGggMSB2IC0xIGMgMCAtMS42NDQ1MzEgLTEuMzU1NDY5IC0zIC0zIC0zIHogbSAtNSA0IGMgLTAuNTUwNzgxIDAgLTEgMC40NDkyMTkgLTEgMSBzIDAuNDQ5MjE5IDEgMSAxIHMgMSAtMC40NDkyMTkgMSAtMSBzIC0wLjQ0OTIxOSAtMSAtMSAtMSB6IG0gLTUgMSB2IDQgaCAxIHYgLTQgeiBtIDEzIDAgdiA0IGggMSB2IC00IHogbSAtNC41IDIgbCAtMiAyIGwgLTEuNSAtMSBsIC0yIDIgdiAwLjUgYyAwIDAuNSAwLjUgMC41IDAuNSAwLjUgaCA3IHMgMC40NzI2NTYgLTAuMDM1MTU2IDAuNSAtMC41IHYgLTEgeiBtIC04LjUgMyB2IDEgYyAwIDEuNjQ0NTMxIDEuMzU1NDY5IDMgMyAzIGggMSB2IC0xIGggLTEgYyAtMS4xMDkzNzUgMCAtMiAtMC44OTA2MjUgLTIgLTIgdiAtMSB6IG0gMTMgMCB2IDEgYyAwIDEuMTA5Mzc1IC0wLjg5MDYyNSAyIC0yIDIgaCAtMSB2IDEgaCAxIGMgMS42NDQ1MzEgMCAzIC0xLjM1NTQ2OSAzIC0zIHYgLTEgeiBtIC04IDMgdiAxIGggNCB2IC0xIHogbSAwIDAiIGZpbGw9IiMyZTM0MzQiIGZpbGwtb3BhY2l0eT0iMC4zNDkwMiIvPg0KPC9zdmc+DQo=',
                  getBlobRef: async (file, name, size) => await getBlobRef(file, name, size),
                  HTMLAttributes: this.options.image?.HTMLAttributes ?? {},
                  ...this.options.image
                }

                if (this.options.image?.toolbar !== undefined) {
                  imageOptions.toolbar = {
                    ...this.options.image?.toolbar,
                    tippyOptions: getTippyOptions(
                      this.options.image?.toolbar?.boundary,
                      this.options.image?.toolbar?.appendTo
                    )
                  }
                }

                staticKitExtensions.push([800, ImageExtension.configure(imageOptions)])
              }

              if (this.options.drawingBoard !== false) {
                staticKitExtensions.push([840, DrawingBoardExtension.configure(this.options.drawingBoard)])
              }

              if (this.options.mermaid !== false) {
                staticKitExtensions.push([850, MermaidExtension.configure(this.options.mermaid ?? mermaidOptions)])
              }

              if (this.options.indent !== false) {
                staticKitExtensions.push([
                  860,
                  IndentExtension.configure(this.options.indent ?? indentExtensionOptions)
                ])
              }

              if (this.options.textAlign !== false) {
                staticKitExtensions.push([
                  870,
                  TextAlign.configure(
                    this.options.textAlign ?? {
                      types: ['heading', 'paragraph'],
                      alignments: ['left', 'center', 'right'],
                      defaultAlignment: null
                    }
                  )
                ])
              }

              if (this.options.toolbar !== false) {
                staticKitExtensions.push([
                  900,
                  InlineToolbarExtension.configure({
                    tippyOptions: getTippyOptions(this.options.toolbar?.boundary, this.options.toolbar?.appendTo),
                    element: this.options.toolbar?.element,
                    isHidden: this.options.toolbar?.isHidden,
                    ctx: {
                      mode,
                      objectId: this.options.objectId,
                      objectClass: this.options.objectClass,
                      objectSpace: this.options.objectSpace
                    }
                  })
                ])
              }

              if (mode !== 'compact' && this.options.note !== false) {
                staticKitExtensions.push([1000, NoteExtension.configure(this.options.note ?? {})])
              }

              const allKitExtensions = [...tableKitExtensions, ...modelKitExtensions, ...staticKitExtensions]

              allKitExtensions.sort((a, b) => a[0] - b[0])

              return allKitExtensions.map(([_, ext]) => ext)
            }
          })
        )
      })
      .catch((err) => {
        reject(err)
      })
  })
}

export async function isEditable (editor: Editor): Promise<boolean> {
  return editor.isEditable
}

export async function isHeadingVisible (editor: Editor, ctx: ActionContext): Promise<boolean> {
  return (await isEditable(editor)) && ctx.mode === 'full'
}
