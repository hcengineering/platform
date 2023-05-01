<script lang="ts">
  import { Ref, Space } from '@hcengineering/core'
  import { TabList, SearchEdit } from '@hcengineering/ui'
  import { Viewlet } from '@hcengineering/view'
  import { FilterButton, setActiveViewletId } from '@hcengineering/view-resources'
  import tracker from '../../plugin'
  import { WithLookup } from '@hcengineering/core'
  // import { deviceOptionsStore as deviceInfo } from '@hcengineering/ui'

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

  // $: twoRows = $deviceInfo.twoRows
</script>

<div class="ac-header full divide">
  <div class="ac-header__wrap-title">
    {#if showLabelSelector}
      <slot name="label_selector" />
    {:else}
      <span class="ac-header__title">{label}</span>
    {/if}
  </div>
  <div class="mb-1 clear-mins">
    {#if viewlets.length > 1}
      <TabList
        items={viewslist}
        multiselect={false}
        selected={viewlet?._id}
        onlyIcons
        on:select={(result) => {
          if (result.detail !== undefined) {
            if (viewlet?._id === result.detail.id) return
            viewlet = viewlets.find((vl) => vl._id === result.detail.id)

            if (viewlet) setActiveViewletId(viewlet._id)
          }
        }}
      />
    {/if}
    <slot name="header-tools" />
  </div>
</div>
<div class="ac-header full divide search-start">
  <div class="ac-header-full small-gap">
    <SearchEdit bind:value={search} on:change={() => {}} />
    <!-- <ActionIcon icon={IconMoreH} size={'small'} /> -->
    <div class="buttons-divider" />
    <FilterButton _class={tracker.class.Issue} {space} />
  </div>
  <div class="ac-header-full medium-gap">
    <slot name="extra" />
    <!-- <ActionIcon icon={IconMoreH} size={'small'} /> -->
  </div>
</div>
