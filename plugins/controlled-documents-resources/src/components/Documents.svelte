<script lang="ts">
  import { Document } from '@hcengineering/controlled-documents'
  import { Class, DocumentQuery, Ref, Space, WithLookup } from '@hcengineering/core'
  import type { IntlString, Asset } from '@hcengineering/platform'
  import { IModeSelector } from '@hcengineering/ui'
  import view, { Viewlet, ViewletPreference, ViewOptions } from '@hcengineering/view'
  import { ViewletPanelHeader } from '@hcengineering/view-resources'

  import document from '../plugin'
  import DocumentsContent from './document/DocumentsContent.svelte'

  export let _class: Ref<Class<Document>> = document.class.Document
  export let query: DocumentQuery<Document> = {}
  export let title: IntlString
  export let icon: Asset | undefined = undefined
  export let space: Ref<Space> | undefined = undefined
  export let panelWidth: number = 0
  export let modeSelectorProps: IModeSelector | undefined = undefined

  let preference: ViewletPreference | undefined = undefined
  let resultQuery: DocumentQuery<Document> = { ...query }
  let viewlet: WithLookup<Viewlet> | undefined = undefined
  let viewOptions: ViewOptions | undefined

  let asideFloat: boolean = false
  let asideShown: boolean = true
  $: if (panelWidth < 900 && !asideFloat) asideFloat = true
  $: if (panelWidth >= 900 && asideFloat) {
    asideFloat = false
    asideShown = false
  }
</script>

<ViewletPanelHeader
  viewletQuery={{
    attachTo: _class,
    descriptor: view.viewlet.Table
  }}
  bind:viewlet
  bind:viewOptions
  bind:preference
  {_class}
  {title}
  {icon}
  adaptive={'doubleRow'}
  {modeSelectorProps}
  {query}
  bind:resultQuery
/>
<div class="flex w-full h-full clear-mins">
  {#if viewlet !== undefined && viewOptions}
    <DocumentsContent {_class} {viewOptions} {viewlet} query={resultQuery} {space} {preference} />
  {/if}
  {#if $$slots.aside !== undefined && asideShown}
    <div class="popupPanel-body__aside flex" class:float={asideFloat} class:shown={asideShown}>
      <slot name="aside" />
    </div>
  {/if}
</div>
