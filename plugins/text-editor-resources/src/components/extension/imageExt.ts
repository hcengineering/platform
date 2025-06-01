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
import { ImageNode, type ImageOptions } from '@hcengineering/text'
import textEditor from '@hcengineering/text-editor'
import { getEventPositionElement, SelectPopup, showPopup } from '@hcengineering/ui'
import { type Editor, mergeAttributes, nodeInputRule } from '@tiptap/core'
import { type ResolvedPos, type Node } from '@tiptap/pm/model'
import { type EditorState, Plugin, PluginKey } from '@tiptap/pm/state'
import {
  CursorSource,
  getToolbarCursor,
  registerToolbarProvider,
  setLoadingState,
  type ResolveCursorProps,
  type ToolbarCursor
} from './toolbar/toolbar'
import { notEmpty } from '@hcengineering/core'

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
          ({ chain, tr, state }) => {
            const cursor = getCursor(state)
            if (cursor === null) return false
            return chain()
              .setNodeSelection(cursor.range.from)
              .updateAttributes(this.name, { ...options })
              .setNodeSelection(cursor.range.from)
              .run()
          },

      setImageSize:
        (options) =>
          ({ chain, tr, state }) => {
            const cursor = getCursor(state)
            if (cursor === null) return false
            return chain()
              .setNodeSelection(cursor.range.from)
              .updateAttributes(this.name, { ...options })
              .setNodeSelection(cursor.range.from)
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
      }),
      ImageToolbarPlugin()
    ]
  },

  addNodeView () {
    const imageSrcCache = new Map<string, { src: string, srcset: string }>()

    return ({ view, node, HTMLAttributes }) => {
      const container = document.createElement('div')
      const imgElement = document.createElement('img')
      container.append(imgElement)
      const divAttributes = {
        class: 'text-editor-image-container',
        'data-type': this.name,
        'data-align': node.attrs.align
      }

      setLoadingState(view, container, true)
      const setImageProps = (src: string | null, srcset: string | null): void => {
        if (src != null) imgElement.src = src
        if (srcset != null) imgElement.srcset = srcset
        void imgElement.decode().finally(() => {
          setLoadingState(view, container, false)
        })
      }

      for (const [k, v] of Object.entries(divAttributes)) {
        if (v !== null) {
          container.setAttribute(k, v)
        }
      }

      const imgAttributes = mergeAttributes(
        {
          'data-type': this.name
        },
        this.options.HTMLAttributes,
        HTMLAttributes
      )
      for (const [k, v] of Object.entries(imgAttributes)) {
        if (k !== 'src' && k !== 'srcset' && v !== null) {
          imgElement.setAttribute(k, v)
        }
      }
      const fileId = imgAttributes['file-id']
      if (fileId !== null && imageSrcCache.has(fileId)) {
        const cached = imageSrcCache.get(fileId)
        setImageProps(cached?.src ?? null, cached?.srcset ?? null)
      }
      if (fileId != null) {
        const setBrokenImg = setTimeout(() => {
          imgElement.src = this.options.loadingImgSrc ?? `platform://platform/files/workspace/?file=${fileId}`
        }, 500)
        if (fileId != null) {
          void this.options.getBlobRef(fileId).then((val) => {
            clearTimeout(setBrokenImg)

            setImageProps(val.src, val.srcset)
            imageSrcCache.set(fileId, { src: val.src, srcset: val.srcset })

            void imgElement.decode().finally(() => {
              setLoadingState(view, container, false)
            })
          })
        }
      } else {
        setImageProps(imgAttributes.src ?? null, imgAttributes.srcset ?? null)
      }

      container.setAttribute('data-toolbar-prevent-anchoring', 'true')
      imgElement.setAttribute('data-toolbar-anchor', 'true')

      return {
        dom: container
      }
    }
  }
})

function ImageToolbarPlugin (): Plugin {
  return new Plugin({
    key: new PluginKey('image-toolbar'),

    view: (view) => {
      registerToolbarProvider(view, { name: 'image', resolveCursor, priority: 40 })
      return {}
    }
  })
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ImageToolbarCursorProps {}

function resolveCursorChildNode ($pos?: ResolvedPos): { node: Node | null, index: number, offset: number } | null {
  if ($pos === undefined) return null

  const parent = $pos.parent
  const offset = $pos.pos - $pos.start()

  const children = [parent.childAfter(offset)].filter(notEmpty)
  const node = children.find((n) => n.node?.type.name === ImageExtension.name)

  return node ?? null
}

function resolveCursor (props: ResolveCursorProps): ToolbarCursor<ImageToolbarCursorProps> | null {
  if (props.source === CursorSource.Selection && props.range.to - props.range.from !== 1) {
    return null
  }

  if (props.range.to - props.range.from > 1) {
    return null
  }

  const $pos = props.editorState.doc.resolve(props.range.from)

  const child = resolveCursorChildNode($pos)
  if (child == null) return null
  if (child.node === null) return null

  const pos = $pos.posAtIndex(child.index)

  const newCursor: ToolbarCursor<ImageToolbarCursorProps> = {
    tag: 'image',
    props: {},
    nodes: [{ node: child.node, pos }],
    range: { from: pos, to: pos + child.node.nodeSize },
    source: props.source,
    requireAnchoring: true,
    anchor: props.anchor,
    viewOptions: {
      style: 'regular'
    }
  }

  return newCursor
}

function getImageNodeFromCursor (state: EditorState): Node | null {
  const cursor = getCursor(state)

  const node = cursor?.nodes[0].node
  if (node === undefined || node.type.name !== ImageExtension.name) {
    return null
  }

  return node
}

export async function openImage (editor: Editor): Promise<void> {
  const node = getImageNodeFromCursor(editor.state)
  if (node === null) return

  const attributes = node.attrs
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

function getCursor (state: EditorState): ToolbarCursor<ImageToolbarCursorProps> | null {
  const cursor = getToolbarCursor<ImageToolbarCursorProps>(state)
  if (cursor === null || cursor.tag !== 'image') {
    return null
  }
  return cursor
}

export async function downloadImage (editor: Editor): Promise<void> {
  const node = getImageNodeFromCursor(editor.state)
  if (node === null) return

  const attributes = node.attrs
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
  const node = getImageNodeFromCursor(editor.state)
  if (node === null) return

  const attributes = node.attrs
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
