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

import { type Class, type Doc, type Ref } from '@hcengineering/core'
import { getMetadata, getResource } from '@hcengineering/platform'
import presentation, { getClient } from '@hcengineering/presentation'
import { parseLocation, showPopup } from '@hcengineering/ui'
import view from '@hcengineering/view'
import workbench, { type Application } from '@hcengineering/workbench'
import { type Editor, Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import LinkPopup from '../LinkPopup.svelte'

export const LinkUtilsExtension = Extension.create<any>({
  name: 'linkUtils',

  addKeyboardShortcuts () {
    return {
      'Mod-k': () => {
        const { from, to } = this.editor.state.selection
        if (from === to) return false

        const link = this.editor.getAttributes('link').href

        showPopup(LinkPopup, { link }, undefined, undefined, (newLink) => {
          if (newLink === '') {
            this.editor.chain().focus().extendMarkRange('link').unsetLink().run()
          } else {
            this.editor.chain().focus().extendMarkRange('link').setLink({ href: newLink }).run()
          }
        })

        return true
      }
    }
  },

  addProseMirrorPlugins () {
    return [ResolveReferenceUrlsPlugin(this.editor)]
  }
})

export interface LinkToReferencePluginState {
  references: Map<string, { id: Ref<Doc>, objectclass: Ref<Class<Doc>>, label: string }>
  queue: Set<string>
}

const resolveReferencePluginKey = new PluginKey<LinkToReferencePluginState>('linkToReference')

interface ReferenceProps {
  id: Ref<Doc>
  objectclass: Ref<Class<Doc>>
  label: string
}

export function ResolveReferenceUrlsPlugin (editor: Editor): Plugin<LinkToReferencePluginState> {
  return new Plugin<LinkToReferencePluginState>({
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
          const references = tr.getMeta('linkToReference').references as LinkToReferencePluginState['references']
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

async function getReferenceFromUrl (text: string): Promise<ReferenceProps | undefined> {
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

  let label = ''
  const labelProvider = hierarchy.classHierarchyMixin(objectclass, view.mixin.ObjectIdentifier)
  if (labelProvider !== undefined) {
    const resource = await getResource(labelProvider.provider)
    label = await resource(client, _id)
  } else {
    const titleMixin = hierarchy.classHierarchyMixin(objectclass, view.mixin.ObjectTitle)
    if (titleMixin === undefined) return

    const titleProviderFn = await getResource(titleMixin.titleProvider)
    label = await titleProviderFn(client, _id)
  }

  return {
    id: _id,
    objectclass,
    label
  }
}
