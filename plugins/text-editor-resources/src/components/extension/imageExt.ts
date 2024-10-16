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
import { getEmbeddedLabel } from '@hcengineering/platform'
import { FilePreviewPopup, getFileUrl } from '@hcengineering/presentation'
import { ImageNode, type ImageOptions as ImageNodeOptions } from '@hcengineering/text'
import textEditor from '@hcengineering/text-editor'
import { getEventPositionElement, SelectPopup, showPopup } from '@hcengineering/ui'
import { type Editor, nodeInputRule } from '@tiptap/core'
import { type BubbleMenuOptions } from '@tiptap/extension-bubble-menu'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { InlinePopupExtension } from './inlinePopup'

/**
 * @public
 */
export type ImageAlignment = 'center' | 'left' | 'right'

/**
 * @public
 */
export type ImageOptions = ImageNodeOptions & {
  toolbar?: Omit<BubbleMenuOptions, 'pluginKey'> & {
    isHidden?: () => boolean
  }
}

export interface ImageAlignmentOptions {
  align?: ImageAlignment
}

export interface ImageSizeOptions {
  height?: number | string
  width?: number | string
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    image: {
      /**
       * Add an image
       */
      setImage: (options: { src: string, alt?: string, title?: string }) => ReturnType
      /**
       * Set image alignment
       */
      setImageAlignment: (options: ImageAlignmentOptions) => ReturnType
      /**
       * Set image size
       */
      setImageSize: (options: ImageSizeOptions) => ReturnType
    }
  }
}

/**
 * @public
 */
export const inputRegex = /(?:^|\s)(!\[(.+|:?)]\((\S+)(?:(?:\s+)["'](\S+)["'])?\))$/

/**
 * @public
 */
export const ImageExtension = ImageNode.extend<ImageOptions>({
  addOptions () {
    return {
      inline: true,
      HTMLAttributes: {},
      getBlobRef: async () => ({ src: '', srcset: '' })
    }
  },

  parseHTML () {
    return [
      {
        tag: `img[data-type="${this.name}"]`
      },
      {
        tag: 'img[src]'
      }
    ]
  },

  addCommands () {
    return {
      setImage:
        (options) =>
          ({ commands }) => {
            return commands.insertContent({
              type: this.name,
              attrs: options
            })
          },

      setImageAlignment:
        (options) =>
          ({ chain, tr }) => {
            const { from } = tr.selection
            return chain()
              .updateAttributes(this.name, { ...options })
              .setNodeSelection(from)
              .run()
          },

      setImageSize:
        (options) =>
          ({ chain, tr }) => {
            const { from } = tr.selection
            return chain()
              .updateAttributes(this.name, { ...options })
              .setNodeSelection(from)
              .run()
          }
    }
  },

  addInputRules () {
    return [
      nodeInputRule({
        find: inputRegex,
        type: this.type,
        getAttributes: (match) => {
          const [, , alt, src, title] = match

          return { src, alt, title }
        }
      })
    ]
  },

  addProseMirrorPlugins () {
    return [
      new Plugin({
        key: new PluginKey('handle-image-open'),
        props: {
          handleDoubleClickOn (view, pos, node, nodePos, event) {
            if (node.type.name !== ImageExtension.name) {
              return
            }

            const fileId = node.attrs['file-id'] ?? node.attrs.src
            const fileName = node.attrs.alt ?? ''
            const fileType = node.attrs['data-file-type'] ?? 'image/*'

            const metadata = node.attrs.width !== undefined ? { originalWidth: node.attrs.width } : {}

            showPopup(
              FilePreviewPopup,
              {
                file: fileId,
                name: fileName,
                contentType: fileType,
                metadata,
                fullSize: true,
                showIcon: false
              },
              'centered'
            )
          }
        }
      })
    ]
  },

  addExtensions () {
    return [
      InlinePopupExtension.configure({
        ...this.options.toolbar,
        shouldShow: ({ editor, view, state, oldState, from, to }) => {
          if (this.options.toolbar?.isHidden?.() === true) {
            return false
          }

          if (editor.isDestroyed) {
            return false
          }

          // For some reason shouldShow might be called after dismount and
          // after destroying the editor. We should handle this just no to have
          // any errors in runtime
          const editorElement = editor.view.dom
          if (editorElement === null || editorElement === undefined) {
            return false
          }

          // When clicking on a element inside the bubble menu the editor "blur" event
          // is called and the bubble menu item is focussed. In this case we should
          // consider the menu as part of the editor and keep showing the menu
          const isChildOfMenu = editorElement.contains(document.activeElement)
          const hasEditorFocus = view.hasFocus() || isChildOfMenu
          if (!hasEditorFocus) {
            return false
          }

          return editor.isActive('image')
        }
      })
    ]
  }
})

export async function openImage (editor: Editor): Promise<void> {
  const attributes = editor.getAttributes('image')
  const fileId = attributes['file-id'] ?? attributes.src
  const fileName = attributes.alt ?? ''
  const fileType = attributes['data-file-type'] ?? 'image/*'
  await new Promise<void>((resolve) => {
    showPopup(
      FilePreviewPopup,
      {
        file: fileId,
        name: fileName,
        contentType: fileType,
        fullSize: true,
        showIcon: false
      },
      'centered',
      () => {
        resolve()
      }
    )
  })
}

export async function downloadImage (editor: Editor): Promise<void> {
  const attributes = editor.getAttributes('image')
  const fileId = attributes['file-id'] ?? attributes.src
  const href = getFileUrl(fileId)

  const link = document.createElement('a')
  link.style.display = 'none'
  link.target = '_blank'
  link.href = href
  link.download = attributes.title ?? attributes.alt ?? ''
  link.click()
}

export async function expandImage (editor: Editor): Promise<void> {
  const attributes = editor.getAttributes('image')
  const fileId = attributes['file-id'] ?? attributes.src
  const url = getFileUrl(fileId)
  window.open(url, '_blank')
}

export async function moreImageActions (editor: Editor, event: MouseEvent): Promise<void> {
  const widthActions = ['25%', '50%', '75%', '100%', textEditor.string.Unset].map((it) => {
    return {
      id: `#imageWidth${it}`,
      label: it === textEditor.string.Unset ? it : getEmbeddedLabel(it),
      action: () =>
        editor.commands.setImageSize({ width: it === textEditor.string.Unset ? undefined : it, height: undefined }),
      category: {
        label: textEditor.string.Width
      }
    }
  })

  const actions = [...widthActions]

  await new Promise<void>((resolve) => {
    showPopup(
      SelectPopup,
      {
        value: actions
      },
      getEventPositionElement(event),
      (val) => {
        if (val !== undefined) {
          const op = actions.find((it) => it.id === val)
          if (op !== undefined) {
            op.action()
            resolve()
          }
        }
      }
    )
  })
}
