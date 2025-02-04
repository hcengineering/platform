<script lang="ts">
  import calendarPlugin from '@hcengineering/calendar'
  import { getCurrentEmployee } from '@hcengineering/contact'
  import { PersonPresenter } from '@hcengineering/contact-resources'
  import { Chevron, Label } from '@hcengineering/ui'
  import { EventPersonMapping } from '../../../types'
  import TimePresenter from '../../presenters/TimePresenter.svelte'
  import { isVisibleMe } from '../utils'
  import EventItem from './EventItem.svelte'
  import PlanItem from './PlanItem.svelte'

  let expanded: boolean = false
  const mePerson = getCurrentEmployee()

  export let gitem: EventPersonMapping
  export let showAssignee: boolean = false
</script>

<div class="header flex-between px-2 flexn-no-shrink">
  <div class="flex-row-center flex-grow flex-between">
    <div class="label ml-1-5">
      <PersonPresenter value={gitem.user} shouldShowAvatar shouldShowName={true} />
    </div>
  </div>
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div class="mr-2 flex-row-center">
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div
      class="ml-2 p-1"
      on:click|preventDefault|stopPropagation={() => {
        expanded = !expanded
      }}
    >
      <div class="flex-row-center">
        <Chevron {expanded} marginRight={'.5rem'} />
      </div>
    </div>
    <TimePresenter value={gitem.total} />
  </div>
</div>
{#each gitem.mappings as item}
  <PlanItem {item} {showAssignee} showSlots={expanded} />
{/each}

{#each gitem.events as event}
  <EventItem item={event} showTime={expanded} />
{/each}

{#if gitem.busy.slots.length > 0}
  <PlanItem item={gitem.busy} {showAssignee} showSlots={expanded} />
{/if}

{#if gitem.busyTotal > 0}
  <div class="item flex-between items-baseline">
    <div class="flex-col">
      <div class="overflow-label flex-no-shrink">
        <Label label={calendarPlugin.string.Busy} />
        {#each gitem.busyEvents as event}
          {#if isVisibleMe(event, mePerson)}
            <EventItem item={event} showTime={expanded} />
          {/if}
        {/each}
      </div>
    </div>
    <div class="flex-row-center whitespace-nowra flex-gap-4 flex-no-shrink ml-4">
      <TimePresenter value={gitem.busyTotal} />
    </div>
  </div>
{/if}

<style lang="scss">
  .header {
    margin-top: 1.75rem;
  }
  .item {
    margin: 0.25rem 1rem 0.25rem 1rem;
  }

  .label {
    color: var(--theme-caption-color);
    font-weight: 500;
  }

  .divider {
    border-top: 1px solid var(--theme-table-border-color);
  }

  .container {
    margin-top: 0.75rem;
    border: 1px solid var(--theme-table-border-color);
    border-radius: 0.5rem;
  }
</style>
