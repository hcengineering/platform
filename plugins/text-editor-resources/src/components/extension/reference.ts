import { mergeAttributes, type Editor } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import MentionList from '../MentionList.svelte'
import { SvelteRenderer } from '../node-view'

import { ReferenceNode, type ReferenceNodeProps, type ReferenceOptions } from '@hcengineering/text'
import Suggestion, { type SuggestionKeyDownProps, type SuggestionOptions, type SuggestionProps } from './suggestion'

import { type Class, type Doc, type Ref } from '@hcengineering/core'
import { getMetadata, getResource } from '@hcengineering/platform'
import presentation, { createQuery, getClient } from '@hcengineering/presentation'
import { parseLocation } from '@hcengineering/ui'
import view from '@hcengineering/view'
import workbench, { type Application } from '@hcengineering/workbench'

export interface ReferenceExtensionOptions extends ReferenceOptions {
  suggestion: Omit<SuggestionOptions, 'editor'>
  showDoc?: (event: MouseEvent, _id: string, _class: string) => void
}

export const ReferenceExtension = ReferenceNode.extend<ReferenceExtensionOptions>({
  addOptions () {
    return {
      HTMLAttributes: {},
      renderLabel ({ options, props }) {
        // eslint-disable-next-line
        return `${options.suggestion.char}${props.label ?? props.id}`
      },
      suggestion: {
        char: '@',
        allowSpaces: true,
        command: ({ editor, range, props }) => {
          // increase range.to by one when the next node is of type "text"
          // and starts with a space character
          const nodeAfter = editor.view.state.selection.$to.nodeAfter
          const overrideSpace = nodeAfter?.text?.startsWith(' ')

          if (overrideSpace !== undefined && overrideSpace) {
            // eslint-disable-next-line
            range.to += 1
          }

          if (props !== null) {
            editor
              .chain()
              .focus()
              .insertContentAt(range, [
                {
                  type: this.name,
                  attrs: props
                },
                {
                  type: 'text',
                  text: ' '
                }
              ])
              .run()
          }
        },
        allow: ({ editor, range }) => {
          if (range.from > editor.state.doc.content.size) return false
          const $from = editor.state.doc.resolve(range.from)
          const type = editor.schema.nodes[this.name]
          // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
          return !!$from.parent.type.contentMatch.matchType(type)
        }
      }
    }
  },

  addNodeView () {
    return ({ node, HTMLAttributes }) => {
      const span = document.createElement('span')
      span.setAttribute('data-type', this.name)
      span.className = 'antimention'
      const attributes = mergeAttributes(
        {
          'data-type': this.name,
          class: 'antiMention'
        },
        this.options.HTMLAttributes,
        HTMLAttributes
      )

      span.addEventListener('click', (event) => {
        if (event.button !== 0) return

        const link = (event.target as HTMLElement)?.closest('span')
        if (link != null) {
          const _class = link.getAttribute('data-objectclass')
          const _id = link.getAttribute('data-id')
          if (_id != null && _class != null) {
            this.options.showDoc?.(event, _id, _class)
          }
        }
      })

      Object.entries(attributes).forEach(([key, value]) => {
        span.setAttribute(key, value)
      })

      const query = createQuery(true)
      const options = this.options

      const renderLabel = (props: ReferenceNodeProps): void => {
        span.setAttribute('data-label', props.label)
        span.innerText = options.renderLabel({ options, props: props ?? node.attrs })
      }

      const id = node.attrs.id
      const objectclass: Ref<Class<Doc>> = node.attrs.objectclass

      renderLabel({ id, objectclass, label: node.attrs.label })

      if (id !== undefined && objectclass !== undefined) {
        query.query(objectclass, { _id: id }, async (result) => {
          const obj = result[0]
          if (obj === undefined) return

          const label = await getReferenceLabel(objectclass, id, obj)
          if (label === '') return

          renderLabel({ id, objectclass, label })
        })
      }

      return {
        dom: span,
        update (node, decorations) {
          renderLabel({ id, objectclass, label: node.attrs.label })
          return true
        },
        destroy () {
          query.unsubscribe()
        }
      }
    }
  },

  addKeyboardShortcuts () {
    return {
      Backspace: () =>
        this.editor.commands.command(({ tr, state }) => {
          let isMention = false
          const { selection } = state
          const { empty, anchor } = selection

          if (!empty) {
            return false
          }

          state.doc.nodesBetween(anchor - 1, anchor, (node, pos) => {
            if (node.type.name === this.name) {
              isMention = true

              // eslint-disable-next-line
              tr.insertText(this.options.suggestion.char || '', pos, pos + node.nodeSize)

              return false
            }
          })

          return isMention
        })
    }
  },

  addProseMirrorPlugins () {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion
      }),
      // ReferenceClickHandler(this.options),
      ResolveReferenceUrlsPlugin(this.editor)
    ]
  }
})

/**
 * @public
 */
export const referenceConfig: Partial<ReferenceExtensionOptions> = {
  HTMLAttributes: {
    class: 'reference'
  },
  suggestion: {
    items: async () => {
      return []
    },
    render: () => {
      let component: any

      return {
        onStart: (props: SuggestionProps) => {
          component = new SvelteRenderer(MentionList, {
            element: document.body,
            props: {
              ...props,
              close: () => {
                component?.destroy()
              }
            }
          })
        },
        onUpdate (props: SuggestionProps) {
          component?.updateProps(props)
        },
        onKeyDown (props: SuggestionKeyDownProps) {
          if (props.event.key === 'Escape') {
            props.event.stopPropagation()
          }
          return component?.onKeyDown(props)
        },
        onExit () {
          component?.destroy()
        }
      }
    }
  }
}

export interface ResolveReferenceUrlsPluginState {
  references: Map<string, { id: Ref<Doc>, objectclass: Ref<Class<Doc>>, label: string }>
  queue: Set<string>
}

const resolveReferencePluginKey = new PluginKey<ResolveReferenceUrlsPluginState>('linkToReference')

export function ResolveReferenceUrlsPlugin (editor: Editor): Plugin<ResolveReferenceUrlsPluginState> {
  return new Plugin<ResolveReferenceUrlsPluginState>({
    key: resolveReferencePluginKey,

    appendTransaction: (transactions, oldState, newState) => {
      if (transactions[0]?.getMeta('linkToReference') === undefined) return undefined
      if (editor.schema.nodes.reference === undefined) return

      const references = resolveReferencePluginKey.getState(newState)?.references ?? new Map()

      const { tr } = newState
      tr.doc.descendants((node, pos) => {
        if (!node.isText || !node.marks.some((m) => m.type.name === 'link')) return

        const url = node.textContent
        const mapping = references.get(url)
        if (mapping === undefined) return

        const replacementNode = editor.schema.nodes.reference.create(mapping)
        const mpos = tr.mapping.map(pos)
        tr.replaceWith(mpos, mpos + node.nodeSize, replacementNode)
      })

      if (tr.steps.length > 0) return tr
    },

    state: {
      init () {
        return {
          references: new Map(),
          queue: new Set()
        }
      },
      apply (tr, prev, oldState, newState) {
        if (tr.getMeta('linkToReference') !== undefined) {
          const references = tr.getMeta('linkToReference').references as ResolveReferenceUrlsPluginState['references']
          const urls = new Set(references.keys())
          return {
            queue: new Set(Array.from(prev.queue).filter((url) => !urls.has(url))),
            references: new Map([...prev.references, ...references])
          }
        }

        if (!tr.docChanged || oldState.doc.eq(newState.doc)) return prev

        const urls: string[] = []
        tr.doc.descendants((node) => {
          if (!node.isText || !node.marks.some((m) => m.type.name === 'link')) return
          const url = node.textContent

          const hasNoMapping = prev.references.has(url) && prev.references.get(url) === undefined
          if (prev.queue.has(url) || hasNoMapping) return

          urls.push(url)
        })

        const promises = urls.map(async (url) => {
          try {
            return [url, await getReferenceFromUrl(url)] as const
          } catch {
            return [url, undefined] as const
          }
        })

        if (promises.length > 0) {
          void Promise.all(promises).then((references) => {
            editor.view.dispatch(editor.state.tr.setMeta('linkToReference', { references: new Map(references) }))
          })
        }

        return {
          references: prev.references,
          queue: new Set([...prev.queue, ...urls])
        }
      }
    }
  })
}

export async function getReferenceLabel<T extends Doc> (
  objectclass: Ref<Class<T>>,
  id: Ref<T>,
  doc?: T
): Promise<string> {
  const client = getClient()
  const hierarchy = client.getHierarchy()

  const labelProvider = hierarchy.classHierarchyMixin(objectclass as Ref<Class<Doc>>, view.mixin.ObjectIdentifier)
  const labelProviderFn = labelProvider !== undefined ? await getResource(labelProvider.provider) : undefined

  const titleMixin = hierarchy.classHierarchyMixin(objectclass as Ref<Class<Doc>>, view.mixin.ObjectTitle)
  const titleProviderFn = titleMixin !== undefined ? await getResource(titleMixin.titleProvider) : undefined

  const identifier = (await labelProviderFn?.(client, id, doc)) ?? ''
  const title = (await titleProviderFn?.(client, id, doc)) ?? ''

  const label = identifier !== '' && title !== '' && identifier !== title ? `${identifier} ${title}` : title ?? ''

  return label
}

export async function getReferenceFromUrl (text: string): Promise<ReferenceNodeProps | undefined> {
  const client = getClient()
  const hierarchy = client.getHierarchy()

  const url = new URL(text)

  const frontUrl = getMetadata(presentation.metadata.FrontUrl) ?? window.location.origin
  if (url.origin !== frontUrl) return

  const location = parseLocation(url)

  const appAlias = (location.path[2] ?? '').trim()
  if (!(appAlias.length > 0)) return

  const excludedApps = getMetadata(workbench.metadata.ExcludedApplications) ?? []
  const apps: Application[] = client
    .getModel()
    .findAllSync<Application>(workbench.class.Application, { hidden: false, _id: { $nin: excludedApps } })

  const app = apps.find((p) => p.alias === appAlias)

  if (app?.locationResolver === undefined) return
  const locationResolverFn = await getResource(app.locationResolver)
  const resolvedLocation = await locationResolverFn(location)

  const locationParts = decodeURIComponent(resolvedLocation?.loc?.fragment ?? '').split('|')
  const id = locationParts[1] as Ref<Doc>
  const objectclass = locationParts[2] as Ref<Class<Doc>>
  if (id === undefined || objectclass === undefined) return

  const linkProviders = client.getModel().findAllSync(view.mixin.LinkIdProvider, {})
  const linkProvider = linkProviders.find(({ _id }) => hierarchy.isDerived(objectclass, _id))
  const _id: Ref<Doc> | undefined =
    linkProvider !== undefined ? (await (await getResource(linkProvider.decode))(id)) ?? id : id

  const label = await getReferenceLabel(objectclass, id)
  if (label === '') return

  return {
    id: _id,
    objectclass,
    label
  }
}
