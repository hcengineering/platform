//
// Copyright © 2025 Hardcore Engineering Inc.
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

import { mergeAttributes, type Editor } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import MentionList from '../MentionList.svelte'
import { SvelteRenderer } from '../node-view'

import { ReferenceNode, type ReferenceNodeProps, type ReferenceOptions } from '@hcengineering/text'
import Suggestion, { type SuggestionKeyDownProps, type SuggestionOptions, type SuggestionProps } from './suggestion'

import { type Class, type Doc, type Ref } from '@hcengineering/core'
import { getMetadata, getResource, translate } from '@hcengineering/platform'
import presentation, { createQuery, getClient, MessageBox } from '@hcengineering/presentation'
import view from '@hcengineering/view'

import contact from '@hcengineering/contact'
import { parseLocation, showPopup, tooltip, type LabelAndProps, type Location } from '@hcengineering/ui'
import workbench, { type Application } from '@hcengineering/workbench'

export interface ReferenceExtensionOptions extends ReferenceOptions {
  suggestion: Omit<SuggestionOptions, 'editor'>
  docClass?: Ref<Class<Doc>>
  multipleMentions?: boolean
  openDocument?: (_class: Ref<Class<Doc>>, _id: Ref<Doc>, event?: MouseEvent) => void | Promise<void>
}

export const ReferenceExtension = ReferenceNode.extend<ReferenceExtensionOptions>({
  addOptions () {
    return {
      HTMLAttributes: {},
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
      const root = document.createElement('span')
      root.className = 'antiMention'
      const attributes = mergeAttributes(
        {
          'data-type': this.name,
          'data-id': node.attrs.id,
          'data-objectclass': node.attrs.objectclass,
          'data-label': node.attrs.label,
          'data-toolbar-anchor': 'true',
          'data-toolbar-prevent-anchoring': 'true',
          class: 'antiMention'
        },
        this.options.HTMLAttributes,
        HTMLAttributes
      )
      const withoutDoc = [contact.mention.Everyone, contact.mention.Here].includes(node.attrs.id)
      const id = node.attrs.id
      const objectclass: Ref<Class<Doc>> = node.attrs.objectclass

      root.addEventListener('click', (event) => {
        if (withoutDoc) return
        if (event.button !== 0) return
        if (broken) {
          showPopup(MessageBox, {
            label: presentation.string.UnableToFollowMention,
            message: presentation.string.AccessDenied,
            canSubmit: false
          })
        }
        const _class = objectclass
        const _id = id
        if (_id != null && _class != null) {
          void this.options.openDocument?.(_class, _id, event)
        }
      })

      Object.entries(attributes).forEach(([key, value]) => {
        root.setAttribute(key, value)
      })

      const client = getClient()
      const hierarchy = client.getHierarchy()

      const query = createQuery(true)
      const options = this.options

      let broken = false

      const renderLabel = async (props: ReferenceNodeProps): Promise<void> => {
        root.setAttribute('data-label', props.label)

        if (props.id === contact.mention.Here) {
          const trans = await translate(contact.string.Here, {})
          titleSpan.innerText = `${iconUrl !== '' ? '' : options.suggestion.char}${trans}`
          root.classList.add('lower')
        } else if (props.id === contact.mention.Everyone) {
          const trans = await translate(contact.string.Everyone, {})
          titleSpan.innerText = `${iconUrl !== '' ? '' : options.suggestion.char}${trans}`
          root.classList.add('lower')
        } else {
          titleSpan.innerText = `${iconUrl !== '' ? '' : options.suggestion.char}${props.label ?? props.id}`
        }
        if (broken) {
          root.classList.add('broken')
        } else {
          root.classList.remove('broken')
        }
      }

      const icon =
        objectclass !== undefined && !hierarchy.isDerived(objectclass, contact.class.Contact)
          ? hierarchy.getClass(objectclass).icon
          : undefined

      const iconUrl = typeof icon === 'string' ? getMetadata(icon) ?? 'https://anticrm.org/logo.svg' : ''

      if (iconUrl !== '') {
        const svg = root.appendChild(document.createElementNS('http://www.w3.org/2000/svg', 'svg'))
        root.appendChild(document.createTextNode(' '))
        svg.setAttribute('class', 'svg-small')
        svg.setAttribute('fill', 'currentColor')
        const use = svg.appendChild(document.createElementNS('http://www.w3.org/2000/svg', 'use'))
        use.setAttributeNS('http://www.w3.org/1999/xlink', 'href', iconUrl)
      }

      let tooltipHandle: any
      const resetTooltipHandle = (newState: any): void => {
        if (typeof tooltipHandle?.destroy === 'function') {
          tooltipHandle.destroy()
        }
        tooltipHandle = newState
      }

      const titleSpan = root.appendChild(document.createElement('span'))
      void renderLabel({ id, objectclass, label: node.attrs.label })

      if (id !== undefined && objectclass !== undefined && !withoutDoc) {
        query.query(objectclass, { _id: id }, async (result) => {
          const obj = result[0]
          broken = obj === undefined
          if (broken) {
            void renderLabel({ id, objectclass, label: node.attrs.label })
            resetTooltipHandle(undefined)
          } else {
            const label = await getReferenceLabel(objectclass, id, obj)
            if (label === '') return

            let tooltipOptions: LabelAndProps | undefined = await getReferenceTooltip(objectclass, id, obj)
            if (tooltipOptions.component === undefined) {
              tooltipOptions = undefined
            }
            resetTooltipHandle(tooltip(root, tooltipOptions))
            void renderLabel({ id, objectclass, label })
          }
        })
      } else if (withoutDoc) {
        query.unsubscribe()
      }

      return {
        dom: root,
        update (node, decorations) {
          void renderLabel({ id, objectclass, label: node.attrs.label })
          return true
        },
        destroy () {
          query.unsubscribe()
          resetTooltipHandle(undefined)
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
        docClass: this.options.docClass,
        multipleMentions: this.options.multipleMentions,
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
  },
  openDocument: async (_class, _id, event) => {
    const openDocument = await getResource(view.function.OpenDocument)
    await openDocument?.(_class, _id)
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

async function getReferenceTooltip<T extends Doc> (
  objectclass: Ref<Class<T>>,
  id: Ref<T>,
  doc?: T
): Promise<LabelAndProps> {
  const client = getClient()
  const hierarchy = client.getHierarchy()

  const mixin = hierarchy.classHierarchyMixin(objectclass as Ref<Class<Doc>>, view.mixin.ObjectTooltip)

  if (mixin?.provider !== undefined) {
    const providerFn = await getResource(mixin.provider)
    return (await providerFn(client, doc)) ?? { label: hierarchy.getClass(objectclass).label }
  }

  return { label: hierarchy.getClass(objectclass).label }
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

  const label =
    identifier !== '' && title !== '' && identifier !== title
      ? `${identifier} ${title}`
      : title !== ''
        ? title
        : identifier

  return label
}

export async function getReferenceObject<T extends Doc> (
  objectclass: Ref<Class<T>>,
  id: Ref<T>,
  doc?: T
): Promise<Doc | undefined> {
  const client = getClient()
  const hierarchy = client.getHierarchy()

  const referenceObjectProvider = hierarchy.classHierarchyMixin(
    objectclass as Ref<Class<Doc>>,
    view.mixin.ReferenceObjectProvider
  )
  const referenceObjectProviderFn =
    referenceObjectProvider !== undefined ? await getResource(referenceObjectProvider.provider) : undefined

  return await referenceObjectProviderFn?.(client, id, doc)
}

export async function getReferenceFromUrl (urlString: string): Promise<ReferenceNodeProps | undefined> {
  let target = await getTargetObjectFromUrl(urlString)
  if (target === undefined) return

  target = (await getReferenceObject(target._class, target._id)) ?? target

  const label = await getReferenceLabel(target._class, target._id)
  if (label === '') return

  return {
    id: target._id,
    objectclass: target._class,
    label
  }
}

export async function getTargetObjectFromUrl (
  urlOrLocation: string | Location
): Promise<{ _id: Ref<Doc>, _class: Ref<Class<Doc>> } | undefined> {
  const client = getClient()

  let location: Location
  if (typeof urlOrLocation === 'string') {
    if (!URL.canParse(urlOrLocation)) return

    const url = new URL(urlOrLocation)

    const frontUrl = getMetadata(presentation.metadata.FrontUrl) ?? window.location.origin
    if (url.origin !== frontUrl) return

    location = parseLocation(url)
  } else {
    location = urlOrLocation
  }

  const appAlias = (location.path[2] ?? '').trim()
  if (!(appAlias.length > 0)) return
  const excludedApps = getMetadata(workbench.metadata.ExcludedApplications) ?? []
  const apps: Application[] = client
    .getModel()
    .findAllSync<Application>(workbench.class.Application, { hidden: false, _id: { $nin: excludedApps } })

  const app = apps.find((p) => p.alias === appAlias)
  const locationResolver = app?.locationResolver
  const locationDataResolver = app?.locationDataResolver

  if ((location.fragment ?? '') !== '') {
    const obj = await getObjectFromFragment(location.fragment ?? '')
    if (obj !== undefined) return obj
  }

  if (locationResolver !== undefined) {
    const locationResolverFn = await getResource(locationResolver)
    const resolvedLocation = await locationResolverFn(location)
    const obj = await getObjectFromFragment(resolvedLocation?.loc?.fragment ?? '')
    if (obj !== undefined) return obj
  }

  if (locationDataResolver !== undefined) {
    const locationDataResolverFn = await getResource(locationDataResolver)
    const locationData = await locationDataResolverFn(location)
    if (locationData.objectId !== undefined && locationData.objectClass !== undefined) {
      return { _id: locationData.objectId, _class: locationData.objectClass }
    }
  }
}

async function getObjectFromFragment (
  fragment: string
): Promise<{ _id: Ref<Doc>, _class: Ref<Class<Doc>> } | undefined> {
  const client = getClient()
  const hierarchy = client.getHierarchy()

  const locationParts = decodeURIComponent(fragment).split('|')
  const id = locationParts[1] as Ref<Doc>
  const objectclass = locationParts[2] as Ref<Class<Doc>>
  if (id === undefined || objectclass === undefined) return

  const linkProviders = client.getModel().findAllSync(view.mixin.LinkIdProvider, {})
  const linkProvider = linkProviders.find(({ _id }) => hierarchy.isDerived(objectclass, _id))
  const _id: Ref<Doc> | undefined =
    linkProvider !== undefined ? (await (await getResource(linkProvider.decode))(id)) ?? id : id

  return {
    _id,
    _class: objectclass
  }
}

export function buildReferenceUrl (props: Partial<ReferenceNodeProps>, refUrl: string = 'ref://'): string | undefined {
  if (props.id === undefined || props.objectclass === undefined) return
  let url = refUrl + (refUrl.includes('?') ? '&' : '?')
  const query = makeQuery({ _class: props.objectclass, _id: props.id, label: props.label })
  url = `${url}${query}`
  return url
}

export function parseReferenceUrl (urlString: string, refUrl: string = 'ref://'): ReferenceNodeProps | undefined {
  if (!urlString.startsWith(refUrl)) return
  if (!URL.canParse(urlString)) return

  const url = new URL(urlString)
  const label = url.searchParams?.get('label') ?? ''
  const id = (url.searchParams?.get('_id') as Ref<Doc>) ?? undefined
  const objectclass = (url.searchParams?.get('_class') as Ref<Class<Doc>>) ?? undefined

  if (id === undefined || objectclass === undefined) return

  return { label, id, objectclass }
}

function makeQuery (obj: Record<string, string | number | boolean | null | undefined>): string {
  return Object.keys(obj)
    .filter((it) => it[1] != null)
    .map(function (k) {
      return encodeURIComponent(k) + '=' + encodeURIComponent(obj[k] as string | number | boolean)
    })
    .join('&')
}
