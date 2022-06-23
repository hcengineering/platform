<script lang="ts">
  import { Icon, TabList, SearchEdit } from '@anticrm/ui'
  import { Viewlet } from '@anticrm/view'
  import { FilterButton, setActiveViewletId } from '@anticrm/view-resources'
  import tracker from '../../plugin'
  import { WithLookup } from '@anticrm/core'
  import ViewOptions from './ViewOptions.svelte'

  export let viewlet: WithLookup<Viewlet> | undefined
  export let viewlets: WithLookup<Viewlet>[] = []
  export let label: string
  export let search: string

  $: viewslist = viewlets.map((views) => {
    return {
      id: views._id,
      icon: views.$lookup?.descriptor?.icon,
      tooltip: views.$lookup?.descriptor?.label
    }
  })
</script>

<div class="ac-header full">
  <div class="ac-header__wrap-title">
    <div class="ac-header__icon"><Icon icon={tracker.icon.Issues} size={'small'} /></div>
    <span class="ac-header__title">{label}</span>
    <div class="ml-4"><FilterButton _class={tracker.class.Issue} /></div>
  </div>
  <SearchEdit bind:value={search} on:change={() => {}} />
  {#if viewlets.length > 1}
    <TabList
      items={viewslist}
      multiselect={false}
      selected={viewlet?._id}
      kind={'secondary'}
      size={'small'}
      on:select={(result) => {
        if (result.detail !== undefined) {
          viewlet = viewlets.find((vl) => vl._id === result.detail.id)
          if (viewlet) setActiveViewletId(viewlet._id)
        }
      }}
    />
  {/if}
  <ViewOptions {viewlet} />
  <slot name="extra" />
</div>
