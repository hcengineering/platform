<script lang="ts">
  import { Ref, WithLookup } from '@anticrm/core'
  import { IssuesDateModificationPeriod, IssuesGrouping, IssuesOrdering, Team } from '@anticrm/tracker'
  import { Button, Icon, Tooltip, IconOptions, showPopup, eventToHTMLElement } from '@anticrm/ui'
  import { Filter, Viewlet } from '@anticrm/view'
  import { FilterButton } from '@anticrm/view-resources'
  import tracker from '../../plugin'
  import ViewOptionsPopup from './ViewOptionsPopup.svelte'

  export let currentSpace: Ref<Team>
  export let viewlet: WithLookup<Viewlet> | undefined
  export let viewlets: WithLookup<Viewlet>[] = []
  export let label: string
  export let filters: Filter[] = []
  export let viewOptions: {
    groupBy: IssuesGrouping
    orderBy: IssuesOrdering
    completedIssuesPeriod: IssuesDateModificationPeriod
    shouldShowEmptyGroups: boolean
  }

  const handleOptionsEditorOpened = (event: MouseEvent) => {
    if (!currentSpace) {
      return
    }

    showPopup(ViewOptionsPopup, viewOptions, eventToHTMLElement(event), undefined, (result) => {
      if (result) viewOptions = { ...result }
    })
  }
</script>

<div class="ac-header full">
  <div class="ac-header__wrap-title">
    <div class="ac-header__icon"><Icon icon={tracker.icon.Issues} size={'small'} /></div>
    <span class="ac-header__title">{label}</span>
    <div class="ml-4"><FilterButton _class={tracker.class.Issue} bind:filters /></div>
  </div>
  {#if viewlets.length > 1}
    <div class="flex">
      {#each viewlets as v}
        <Tooltip label={v.$lookup?.descriptor?.label} direction={'top'}>
          <button
            class="ac-header__icon-button"
            class:selected={viewlet?._id === v._id}
            on:click={() => {
              viewlet = v
            }}
          >
            {#if v.$lookup?.descriptor?.icon}
              <Icon icon={v.$lookup?.descriptor?.icon} size={'small'} />
            {/if}
          </button>
        </Tooltip>
      {/each}
    </div>
  {/if}
  <Button icon={IconOptions} kind={'link'} on:click={handleOptionsEditorOpened} />
  <slot name="extra" />
</div>
