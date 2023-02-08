<script lang="ts">
  import contact from '@hcengineering/contact'
  import { DocumentQuery, Ref, Space, WithLookup } from '@hcengineering/core'
  import { Sprint } from '@hcengineering/tracker'
  import { Component } from '@hcengineering/ui'
  import { BuildModelKey, Viewlet, ViewOptions } from '@hcengineering/view'
  import tracker from '../../plugin'
  import NewSprint from './NewSprint.svelte'

  export let viewlet: WithLookup<Viewlet>
  export let query: DocumentQuery<Sprint> = {}
  export let space: Ref<Space> | undefined

  // Extra properties
  export let viewOptions: ViewOptions

  const createItemDialog = NewSprint
  const createItemLabel = tracker.string.CreateSprint

  const retrieveMembers = (s: Sprint) => s.members

  function updateConfig (config: (string | BuildModelKey)[]): (string | BuildModelKey)[] {
    return config.map((it) => {
      if (typeof it === 'string') {
        return it
      }
      return it.presenter === contact.component.MembersPresenter
        ? { ...it, props: { ...it.props, retrieveMembers } }
        : it
    })
  }
</script>

{#if viewlet?.$lookup?.descriptor?.component}
  <Component
    is={viewlet.$lookup.descriptor.component}
    props={{
      _class: tracker.class.Sprint,
      config: updateConfig(viewlet.config),
      options: viewlet.options,
      createItemDialog,
      createItemLabel,
      viewlet,
      viewOptions,
      viewOptionsConfig: viewlet.viewOptions?.other,
      space,
      query,
      props: {}
    }}
  />
{/if}
