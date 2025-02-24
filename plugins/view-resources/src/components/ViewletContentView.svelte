<script lang="ts">
  import core, { Class, Doc, DocumentQuery, Ref, Space, WithLookup } from '@hcengineering/core'
  import { IntlString } from '@hcengineering/platform'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { AnySvelteComponent, Component, Loading } from '@hcengineering/ui'
  import view, { ViewOptions, Viewlet, ViewletPreference } from '@hcengineering/view'

  export let viewlet: WithLookup<Viewlet>
  export let _class: Ref<Class<Doc>>
  export let query: DocumentQuery<Doc> = {}
  export let space: Ref<Space> | undefined

  export let viewOptions: ViewOptions

  export let createItemDialog: AnySvelteComponent | undefined = undefined
  export let createItemLabel: IntlString | undefined = undefined
  export let createItemEvent: string | undefined = undefined
  export let createItemDialogProps = { shouldSaveDraft: true }

  const hierarchy = getClient().getHierarchy()

  const preferenceQuery = createQuery()
  const objectConfigurations = createQuery()
  let preference: ViewletPreference[] = []

  let configurationsLoading = true
  let preferencesLoading = true
  $: loading = configurationsLoading || preferencesLoading

  let configurationRaw: Viewlet[] = []
  let configurations: Record<Ref<Class<Doc>>, Viewlet['config']> = {}

  function fetchConfigurations (viewlet: Viewlet): void {
    configurations = {}
    configurationsLoading = objectConfigurations.query(
      view.class.Viewlet,
      {
        attachTo: { $in: hierarchy.getDescendants(_class) },
        descriptor: viewlet.descriptor,
        variant: viewlet.variant ? viewlet.variant : { $exists: false }
      },
      (res) => {
        configurationRaw = res
        configurationsLoading = false
        loading = configurationsLoading || preferencesLoading
      }
    )
  }

  function fetchPreferences (configurationRaw: Viewlet[]): void {
    preferencesLoading = preferenceQuery.query(
      view.class.ViewletPreference,
      {
        space: core.space.Workspace,
        attachedTo: { $in: configurationRaw.map((it) => it._id) }
      },
      (res) => {
        preference = res
        preferencesLoading = false
        loading = configurationsLoading || preferencesLoading
      }
    )
  }

  function updateConfiguration (configurationRaw: Viewlet[], preference: ViewletPreference[]): void {
    const newConfigurations: Record<Ref<Class<Doc>>, Viewlet['config']> = {}

    for (const v of configurationRaw) {
      newConfigurations[v.attachTo] = v.config
    }

    // Add viewlet configurations.
    for (const pref of preference) {
      if (pref.config.length > 0) {
        const vl = configurationRaw.find((it) => it._id === pref.attachedTo)
        if (vl !== undefined) {
          newConfigurations[vl.attachTo] = pref.config
        }
      }
    }

    configurations = newConfigurations
  }

  $: fetchConfigurations(viewlet)
  $: fetchPreferences(configurationRaw)

  $: updateConfiguration(configurationRaw, preference)

  $: config = preference.find((it) => it.attachedTo === viewlet._id)?.config ?? viewlet.config
</script>

{#if viewlet?.$lookup?.descriptor?.component}
  {#if loading}
    <Loading />
  {:else}
    <Component
      is={viewlet.$lookup.descriptor.component}
      props={{
        _class,
        config,
        configurations,
        options: viewlet.options,
        createItemDialog,
        createItemDialogProps,
        createItemLabel,
        createItemEvent,
        viewlet,
        viewOptions,
        viewOptionsConfig: viewlet.viewOptions?.other,
        space,
        query
      }}
    />
  {/if}
{/if}
