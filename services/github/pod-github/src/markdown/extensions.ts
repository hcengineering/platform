import { extensionKit, ServerKit } from '@hcengineering/text'

import { AnyExtension, mergeAttributes, Node } from '@tiptap/core'

export interface SubLinkOptions {
  HTMLAttributes: Record<string, any>
  hasHulyText: (text: string) => boolean
  hasHulyLink: (href: string) => boolean
}

export const SubLink = Node.create<SubLinkOptions>({
  name: 'subLink',

  addOptions () {
    return {
      HTMLAttributes: {},
      hasHulyText: (text: string) => false,
      hasHulyLink: (href: string) => false
    }
  },

  group: 'block',

  content: 'inline*',

  parseHTML () {
    // this plugin contains special parse rule that matches DOM element only when:
    // - it has a special inner text
    // - or it has a special link
    // When no match, the element won't be parsed as sub node but will be processed by other extensions
    return [
      {
        tag: 'sub',
        getAttrs: (el: HTMLElement | string) => {
          if (typeof el !== 'string') {
            if (this.options.hasHulyText(el.textContent ?? '')) {
              return null
            }

            const link = el.querySelector('a[href]')
            const href = link?.getAttribute('href') ?? ''
            if (link != null && this.options.hasHulyLink(href)) {
              return null
            }
          }
          // no match
          return false
        }
      }
    ]
  },

  renderHTML ({ HTMLAttributes }) {
    return ['sub', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0]
  }
})

export const GithubKit = extensionKit(
  'github',
  (e) =>
    ({
      serverKit: e(ServerKit, {
        image: {
          getBlobRef: async () => ({ src: '', srcset: '' })
        }
      }),
      sub: e(SubLink)
    }) as const
)

export const defaultExtensions: AnyExtension[] = [GithubKit]
