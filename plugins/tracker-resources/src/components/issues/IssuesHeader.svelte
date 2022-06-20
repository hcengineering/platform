<script lang="ts">
  import { Ref, WithLookup } from '@anticrm/core'
  import { Team, ViewOptions } from '@anticrm/tracker'
  import { Icon, TabList, showPopup, eventToHTMLElement } from '@anticrm/ui'
  import { Viewlet } from '@anticrm/view'
  import { FilterButton } from '@anticrm/view-resources'
  import tracker from '../../plugin'
  import ViewOptionsPopup from './ViewOptionsPopup.svelte'
  import ViewOptionsButton from './ViewOptionsButton.svelte'

  export let currentSpace: Ref<Team>
  export let viewlet: WithLookup<Viewlet> | undefined
  export let viewlets: WithLookup<Viewlet>[] = []
  export let label: string
  export let viewOptions: ViewOptions

  const handleOptionsEditorOpened = (event: MouseEvent) => {
    if (!currentSpace) {
      return
    }

    showPopup(ViewOptionsPopup, viewOptions, eventToHTMLElement(event), undefined, (result) => {
      if (result) viewOptions = { ...result }
    })
  }

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
  {#if viewlets.length > 1}
    <TabList
      items={viewslist}
      multiselect={false}
      selected={viewlet?._id}
      kind={'secondary'}
      size={'small'}
      on:select={(result) => {
        if (result.detail !== undefined) viewlet = viewlets.find((vl) => vl._id === result.detail.id)
      }}
    />
  {/if}
  <ViewOptionsButton on:click={handleOptionsEditorOpened} />
  <slot name="extra" />
</div>
