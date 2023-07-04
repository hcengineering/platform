<script lang="ts">
  import { Class, Doc, DocumentQuery, Ref, Space, WithLookup } from '@hcengineering/core'
  import { AnySvelteComponent, Component, Loading } from '@hcengineering/ui'
  import view, { Viewlet, ViewletPreference, ViewOptions } from '@hcengineering/view'
  import { createQuery } from '@hcengineering/presentation'
  import { IntlString } from '@hcengineering/platform'

  export let viewlet: WithLookup<Viewlet>
  export let _class: Ref<Class<Doc>>
  export let query: DocumentQuery<Doc> = {}
  export let space: Ref<Space> | undefined

  export let viewOptions: ViewOptions

  export let createItemDialog: AnySvelteComponent | undefined = undefined
  export let createItemLabel: IntlString | undefined = undefined
  export let createItemDialogProps = { shouldSaveDraft: true }

  const preferenceQuery = createQuery()
  let preference: ViewletPreference | undefined
  let loading = true

  $: viewlet &&
    preferenceQuery.query(
      view.class.ViewletPreference,
      {
        attachedTo: viewlet._id
      },
      (res) => {
        preference = res[0]
        loading = false
      },
      { limit: 1 }
    )
</script>

{#if viewlet?.$lookup?.descriptor?.component}
  {#if loading}
    <Loading />
  {:else}
    <Component
      is={viewlet.$lookup.descriptor.component}
      props={{
        _class,
        config: preference?.config ?? viewlet.config,
        options: viewlet.options,
        createItemDialog,
        createItemDialogProps,
        createItemLabel,
        viewlet,
        viewOptions,
        viewOptionsConfig: viewlet.viewOptions?.other,
        space,
        query
      }}
    />
  {/if}
{/if}
