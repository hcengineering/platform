import { getEmbeddedLabel, getMetadata } from '@hcengineering/platform'
import presentation, { getFileUrl } from '@hcengineering/presentation'
import { Action, IconSize, Menu, getEventPositionElement, getIconSize2x, showPopup } from '@hcengineering/ui'
import { Node, createNodeFromContent, mergeAttributes, nodeInputRule } from '@tiptap/core'
import { Plugin, PluginKey } from 'prosemirror-state'
import plugin from '../plugin'

import { Fragment, Node as ProseMirrorNode } from '@tiptap/pm/model'
import { EditorView } from 'prosemirror-view'

/**
 * @public
 */
export type FileAttachFunction = (file: File) => Promise<{ file: string, type: string } | undefined>

/**
 * @public
 */
export interface ImageOptions {
  inline: boolean
  HTMLAttributes: Record<string, any>

  attachFile?: FileAttachFunction

  reportNode?: (id: string, node: ProseMirrorNode) => void
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    image: {
      /**
       * Add an image
       */
      setImage: (options: { src: string, alt?: string, title?: string }) => ReturnType
    }
  }
}

/**
 * @public
 */
export const inputRegex = /(?:^|\s)(!\[(.+|:?)]\((\S+)(?:(?:\s+)["'](\S+)["'])?\))$/

function getType (type: string): 'image' | 'other' {
  if (type.startsWith('image/')) {
    return 'image'
  }

  return 'other'
}

/**
 * @public
 */
export const ImageRef = Node.create<ImageOptions>({
  name: 'image',

  addOptions () {
    return {
      inline: true,
      HTMLAttributes: {}
    }
  },

  inline () {
    return this.options.inline
  },

  group () {
    return this.options.inline ? 'inline' : 'block'
  },

  draggable: true,
  selectable: true,

  addAttributes () {
    return {
      'file-id': {
        default: null
      },
      width: {
        default: null
      },
      height: {
        default: null
      },
      src: {
        default: null
      },
      alt: {
        default: null
      },
      title: {
        default: null
      }
    }
  },

  parseHTML () {
    return [
      {
        tag: `img[data-type="${this.name}"]`
      }
    ]
  },

  renderHTML ({ node, HTMLAttributes }) {
    const merged = mergeAttributes(
      {
        'data-type': this.name
      },
      this.options.HTMLAttributes,
      HTMLAttributes
    )
    const id = merged['file-id']
    if (id != null) {
      merged.src = getFileUrl(id, 'full')
      let width: IconSize | undefined
      switch (merged.width) {
        case '32px':
          width = 'small'
          break
        case '64px':
          width = 'medium'
          break
        case '128px':
        case '256px':
          width = 'large'
          break
        case '512px':
          width = 'x-large'
          break
      }
      if (width !== undefined) {
        merged.src = getFileUrl(id, width)
        merged.srcset = getFileUrl(id, width) + ' 1x,' + getFileUrl(id, getIconSize2x(width)) + ' 2x'
      }
      merged.class = 'text-editor-image'
      this.options.reportNode?.(id, node)
    }
    return ['img', merged]
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
    const opt = this.options
    function handleDrop (
      view: EditorView,
      pos: { pos: number, inside: number } | null,
      dataTransfer: DataTransfer
    ): any {
      const uris = (dataTransfer.getData('text/uri-list') ?? '').split('\r\n').filter((it) => !it.startsWith('#'))
      let result = false
      for (const uri of uris) {
        if (uri !== '') {
          const url = new URL(uri)
          const uploadUrl = getMetadata(presentation.metadata.UploadURL)
          if (uploadUrl === undefined || !url.href.includes(uploadUrl)) {
            continue
          }

          const _file = (url.searchParams.get('file') ?? '').split('/').join('')

          if (_file.trim().length === 0) {
            continue
          }

          const ctype = dataTransfer.getData('application/contentType')
          const type = getType(ctype ?? 'other')

          let content: ProseMirrorNode | Fragment | undefined
          if (type === 'image') {
            content = createNodeFromContent(
              `<img data-type='image' width='75%' file-id='${_file}'></img>`,
              view.state.schema,
              {
                parseOptions: {
                  preserveWhitespace: 'full'
                }
              }
            )
          }
          if (content !== undefined) {
            view.dispatch(view.state.tr.insert(pos?.pos ?? 0, content))
            result = true
          }
        }
      }
      if (result) {
        return result
      }

      const files = dataTransfer?.files
      if (files !== undefined && opt.attachFile !== undefined) {
        for (let i = 0; i < files.length; i++) {
          const file = files.item(i)
          if (file != null) {
            result = true
            void opt.attachFile(file).then((id) => {
              if (id !== undefined) {
                if (id.type.includes('image')) {
                  const content = createNodeFromContent(
                    `<img data-type='image' width='75%' file-id='${id.file}'></img>`,
                    view.state.schema,
                    {
                      parseOptions: {
                        preserveWhitespace: 'full'
                      }
                    }
                  )
                  view.dispatch(view.state.tr.insert(pos?.pos ?? 0, content))
                }
              }
            })
          }
        }
      }
      return result
    }
    return [
      new Plugin({
        key: new PluginKey('handle-image-paste'),
        props: {
          handlePaste (view, event, slice) {
            const dataTransfer = event.clipboardData
            if (dataTransfer !== null) {
              const res = handleDrop(view, { pos: view.state.selection.$from.pos, inside: 0 }, dataTransfer)
              if (res === true) {
                event.preventDefault()
                event.stopPropagation()
              }
              return res
            }
          },
          handleDrop (view, event, slice) {
            event.preventDefault()
            event.stopPropagation()
            const dataTransfer = event.dataTransfer
            if (dataTransfer !== null) {
              return handleDrop(view, view.posAtCoords({ left: event.x, top: event.y }), dataTransfer)
            }
          },
          handleClick: (view, pos, event) => {
            if (event.button !== 0) {
              return false
            }

            const node = event.target as unknown as HTMLElement
            if (node != null) {
              const fileId = (node as any).attributes['file-id']?.value
              if (fileId === undefined) {
                return false
              }
              const pos = view.posAtDOM(node, 0)

              const actions: Action[] = [
                {
                  label: plugin.string.Width,
                  action: async (props, event) => {},
                  component: Menu,
                  props: {
                    actions: [
                      '32px',
                      '64px',
                      '128px',
                      '256px',
                      '512px',
                      '25%',
                      '50%',
                      '75%',
                      '100%',
                      plugin.string.Unset
                    ].map((it) => {
                      return {
                        label: it === plugin.string.Unset ? it : getEmbeddedLabel(it),
                        action: async () => {
                          view.dispatch(
                            view.state.tr.setNodeAttribute(pos, 'width', it === plugin.string.Unset ? null : it)
                          )
                        }
                      }
                    })
                  }
                },
                {
                  label: plugin.string.Height,
                  action: async (props, event) => {},
                  component: Menu,
                  props: {
                    actions: [
                      '32px',
                      '64px',
                      '128px',
                      '256px',
                      '512px',
                      '25%',
                      '50%',
                      '75%',
                      '100%',
                      plugin.string.Unset
                    ].map((it) => {
                      return {
                        label: it === plugin.string.Unset ? it : getEmbeddedLabel(it),
                        action: async () => {
                          view.dispatch(
                            view.state.tr.setNodeAttribute(pos, 'height', it === plugin.string.Unset ? null : it)
                          )
                        }
                      }
                    })
                  }
                }
              ]
              event.preventDefault()
              event.stopPropagation()
              showPopup(Menu, { actions }, getEventPositionElement(event))
            }
            return false
          }
        }
      })
    ]
  }
})
