<!--
// Copyright © 2024 Hardcore Engineering Inc.
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
-->
<script lang="ts">
  import { Class, Doc, Ref } from '@hcengineering/core'
  import { getResource, translateCB } from '@hcengineering/platform'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { AnyComponent, Icon, LabelAndProps, themeStore, tooltip } from '@hcengineering/ui'
  import view from '@hcengineering/view'

  import { getReferenceLabel } from '@hcengineering/text-editor-resources/src/components/extension/reference'
  import { classIcon } from '../utils'
  import DocNavLink from './DocNavLink.svelte'
  import contact from '@hcengineering/contact'

  export let _id: Ref<Doc> | undefined = undefined
  export let _class: Ref<Class<Doc>> | undefined = undefined
  export let object: Doc | undefined | null
  export let title: string = ''
  export let component: AnyComponent | undefined = undefined
  export let disabled: boolean = false
  export let onClick: ((event: MouseEvent) => void) | undefined = undefined

  const client = getClient()
  const hierarchy = client.getHierarchy()
  const docQuery = createQuery()

  let doc: Doc | undefined = object ?? undefined

  let docLabel: string = ''
  let docTitle: string | undefined = undefined
  let docTooltip: LabelAndProps = {}
  let docComponent: AnyComponent

  let displayTitle = ''

  $: displayTitle = docTitle || title || docLabel
  $: docComponent = getPanelComponent(doc, _class)

  $: if (object == null && _class != null && _id != null) {
    docQuery.query(_class, { _id }, (r) => {
      doc = r.shift()
    })
  } else if (object != null) {
    docQuery.unsubscribe()
    doc = object
  }

  $: icon =
    doc !== undefined && !hierarchy.isDerived(doc._class, contact.class.Contact) ? classIcon(client, doc._class) : null

  $: void updateDocTitle(doc)
  $: void updateDocTooltip(doc)
  $: void updateDocLabel(doc, _class)

  function getPanelComponent (doc?: Doc, _class?: Ref<Class<Doc>>): AnyComponent {
    if (component !== undefined) {
      return component
    }

    const resultClass = doc?._class ?? _class

    if (resultClass === undefined) {
      return view.component.EditDoc
    } else {
      const panelComponent = hierarchy.classHierarchyMixin(resultClass, view.mixin.ObjectPanel)

      return panelComponent?.component ?? view.component.EditDoc
    }
  }

  async function updateDocLabel (doc?: Doc, _class?: Ref<Class<Doc>>): Promise<void> {
    const resultClass = doc?._class ?? _class

    if (resultClass != null) {
      translateCB(hierarchy.getClass(resultClass).label, {}, $themeStore.language, (res) => {
        docLabel = res
      })
    } else {
      docLabel = ''
    }
  }

  async function updateDocTitle (doc: Doc | undefined): Promise<void> {
    docTitle = doc ? await getReferenceLabel(doc._class, doc._id, doc) : undefined
  }

  async function updateDocTooltip (doc?: Doc): Promise<void> {
    if (doc === undefined) {
      docTooltip = {}
      return
    }

    const mixin = hierarchy.classHierarchyMixin(doc._class, view.mixin.ObjectTooltip)

    if (mixin?.provider !== undefined) {
      const providerFn = await getResource(mixin.provider)

      docTooltip = (await providerFn(client, doc)) ?? { label: hierarchy.getClass(doc._class).label }
    } else {
      docTooltip = { label: hierarchy.getClass(doc._class).label }
    }
  }
</script>

{#if displayTitle}
  <span data-type={'reference'} data-id={doc?._id} data-objectclass={doc?._class} data-label={displayTitle}>
    <DocNavLink object={doc} component={docComponent} {disabled} inlineReference {onClick}>
      {#if icon}<Icon {icon} size="small" />{' '}{:else}@{/if}{displayTitle}
    </DocNavLink>
  </span>
{/if}
