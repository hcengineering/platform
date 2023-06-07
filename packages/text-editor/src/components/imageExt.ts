import { getEmbeddedLabel } from '@hcengineering/platform'
import { getFileUrl } from '@hcengineering/presentation'
import { Action, IconSize, Menu, getEventPositionElement, getIconSize2x, showPopup } from '@hcengineering/ui'
import { Node, createNodeFromContent, mergeAttributes, nodeInputRule } from '@tiptap/core'
import { Plugin, PluginKey } from 'prosemirror-state'
import plugin from '../plugin'

import { Node as ProseMirrorNode } from '@tiptap/pm/model'

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

/**
 * @public
 */
export const ImageRef = Node.create<ImageOptions>({
  name: 'image',

  addOptions () {
    return {
      inline: false,
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
      fileid: {
        default: null,
        parseHTML: (element) => element.getAttribute('file-id'),
        renderHTML: (attributes) => {
          // eslint-disable-next-line
          if (!attributes.fileid) {
            return {}
          }

          return {
            'file-id': attributes.fileid
          }
        }
      },
      width: {
        default: null
      },
      height: {
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
    merged.class = 'textEditorImage'
    this.options.reportNode?.(id, node)
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
    return [
      new Plugin({
        key: new PluginKey('handle-image-paste'),
        props: {
          handleDrop (view, event, slice) {
            const uris = (event.dataTransfer?.getData('text/uri-list') ?? '')
              .split('\r\n')
              .filter((it) => !it.startsWith('#'))
            let result = false
            const pos = view.posAtCoords({ left: event.x, top: event.y })
            for (const uri of uris) {
              if (uri !== '') {
                const url = new URL(uri)
                if (url.hostname !== location.hostname) {
                  return
                }

                const _file = (url.searchParams.get('file') ?? '').split('/').join('')

                if (_file.trim().length === 0) {
                  return
                }
                const content = createNodeFromContent(
                  `<img data-type='image' width='75%' file-id='${_file}'></img>`,
                  view.state.schema,
                  {
                    parseOptions: {
                      preserveWhitespace: 'full'
                    }
                  }
                )
                event.preventDefault()
                event.stopPropagation()
                view.dispatch(view.state.tr.insert(pos?.pos ?? 0, content))
                result = true
              }
            }
            if (result) {
              return result
            }

            const files = event.dataTransfer?.files
            if (files !== undefined && opt.attachFile !== undefined) {
              event.preventDefault()
              event.stopPropagation()
              for (let i = 0; i < files.length; i++) {
                const file = files.item(i)
                if (file != null) {
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
