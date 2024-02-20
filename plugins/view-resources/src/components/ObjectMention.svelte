<script lang="ts">
  import { Class, Doc, Ref } from '@hcengineering/core'
  import { AnyComponent, LabelAndProps, themeStore, tooltip } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import { getResource, translate } from '@hcengineering/platform'
  import { createQuery, getClient } from '@hcengineering/presentation'

  import DocNavLink from './DocNavLink.svelte'
  import { getDocIdentifier } from '../utils'

  export let _id: Ref<Doc> | undefined = undefined
  export let _class: Ref<Class<Doc>> | undefined = undefined
  export let object: Doc | undefined | null
  export let title: string = ''
  export let component: AnyComponent | undefined = undefined
  export let disabled: boolean = false
  export let accent: boolean = false
  export let noUnderline: boolean = false
  export let colorInherit: boolean = false
  export let onClick: ((event: MouseEvent) => void) | undefined = undefined

  const client = getClient()
  const hierarchy = client.getHierarchy()
  const docQuery = createQuery()

  let doc: Doc | undefined = object ?? undefined

  let docLabel: string = ''
  let docTitle: string | undefined = undefined
  let docTooltip: LabelAndProps | undefined = undefined
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

  $: updateDocTitle(doc)
  $: updateDocTooltip(doc)
  $: updateDocLabel(doc, _class)

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

  async function updateDocLabel (doc?: Doc, _class?: Ref<Class<Doc>>) {
    const resultClass = doc?._class ?? _class

    if (!resultClass) {
      docLabel = ''
      return
    }

    docLabel = await translate(hierarchy.getClass(resultClass).label, {}, $themeStore.language)
  }

  async function updateDocTitle (doc: Doc | undefined) {
    if (doc === undefined) {
      docTitle = undefined
    } else {
      docTitle = await getDocIdentifier(client, doc._id, doc._class, doc)
    }
  }

  async function updateDocTooltip (doc?: Doc) {
    if (doc === undefined) {
      docTooltip = undefined
      return
    }

    const mixin = hierarchy.classHierarchyMixin(doc._class, view.mixin.ObjectTooltip)

    if (mixin?.provider !== undefined) {
      const providerFn = await getResource(mixin.provider)

      docTooltip = await providerFn(client, doc)
    } else {
      docTooltip = { label: hierarchy.getClass(doc._class).label }
    }
  }
</script>

{#if displayTitle}
  <DocNavLink
    object={doc}
    component={docComponent}
    {disabled}
    {accent}
    {colorInherit}
    {noUnderline}
    inline
    noOverflow
    {onClick}
  >
    <span class="antiMention" use:tooltip={disabled ? undefined : docTooltip}>
      @{displayTitle}
    </span>
  </DocNavLink>
{/if}
