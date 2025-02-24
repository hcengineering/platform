import { ServerKit } from '@hcengineering/text'

import { AnyExtension, Extension, Node, mergeAttributes } from '@tiptap/core'

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

export interface GithubKitOptions {
  sub?: Partial<SubLinkOptions> | false
}

export const GithubKit = Extension.create<GithubKitOptions>({
  name: 'githubKit',

  addExtensions () {
    return [
      ServerKit.configure({
        image: {
          getBlobRef: async () => ({ src: '', srcset: '' })
        }
      }),
      ...(this.options.sub !== false ? [SubLink.configure({ ...this.options.sub })] : [])
    ]
  }
})

export const defaultExtensions: AnyExtension[] = [GithubKit.configure({})]
