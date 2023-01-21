<script lang="ts">
  import { Ref, Space } from '@hcengineering/core'
  import { Icon, TabList, SearchEdit } from '@hcengineering/ui'
  import { Viewlet } from '@hcengineering/view'
  import { FilterButton, setActiveViewletId } from '@hcengineering/view-resources'
  import tracker from '../../plugin'
  import { WithLookup } from '@hcengineering/core'
  import { deviceOptionsStore as deviceInfo } from '@hcengineering/ui'

  export let space: Ref<Space> | undefined = undefined
  export let viewlet: WithLookup<Viewlet> | undefined
  export let viewlets: WithLookup<Viewlet>[] = []
  export let label: string
  export let search: string
  export let showLabelSelector = false

  $: viewslist = viewlets.map((views) => {
    return {
      id: views._id,
      icon: views.$lookup?.descriptor?.icon,
      tooltip: views.$lookup?.descriptor?.label
    }
  })

  $: twoRows = $deviceInfo.twoRows
</script>

<div class="ac-header withSettings" class:full={!twoRows} class:mini={twoRows}>
  <div class:ac-header-full={!twoRows} class:flex-between={twoRows}>
    <div class="ac-header__wrap-title mr-3">
      {#if showLabelSelector}
        <slot name="label_selector" />
      {:else}
        <div class="ac-header__icon"><Icon icon={tracker.icon.Issues} size={'small'} /></div>
        <span class="ac-header__title">{label}</span>
      {/if}
      <div class="ml-4"><FilterButton _class={tracker.class.Issue} {space} /></div>
    </div>
    <SearchEdit bind:value={search} on:change={() => {}} />
  </div>
  <div class="ac-header-full" class:secondRow={twoRows}>
    {#if viewlets.length > 1}
      <TabList
        items={viewslist}
        multiselect={false}
        selected={viewlet?._id}
        kind={'secondary'}
        size={'small'}
        on:select={(result) => {
          if (result.detail !== undefined) {
            if (viewlet?._id === result.detail.id) return
            viewlet = viewlets.find((vl) => vl._id === result.detail.id)
            console.log('set viewlet by issue headed')
            if (viewlet) setActiveViewletId(viewlet._id)
          }
        }}
      />
    {/if}
    <slot name="extra" />
  </div>
</div>
