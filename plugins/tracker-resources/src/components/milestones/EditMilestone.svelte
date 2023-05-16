<script lang="ts">
  import { getClient } from '@hcengineering/presentation'
  import { StyledTextBox } from '@hcengineering/text-editor'
  import { Milestone } from '@hcengineering/tracker'
  import { Button, DatePresenter, EditBox, Icon, IconMoreH, Label, showPopup } from '@hcengineering/ui'
  import { ContextMenu, DocAttributeBar } from '@hcengineering/view-resources'
  import { createEventDispatcher } from 'svelte'
  import { onDestroy } from 'svelte'
  import { activeMilestone } from '../../issues'
  import tracker from '../../plugin'
  import Expanded from '../icons/Expanded.svelte'
  import IssuesView from '../issues/IssuesView.svelte'
  import MilestonePopup from './MilestonePopup.svelte'

  export let milestone: Milestone

  const client = getClient()
  const dispatch = createEventDispatcher()

  async function change (field: string, value: any) {
    await client.update(milestone, { [field]: value })
  }
  let container: HTMLElement

  function selectMilestone (): void {
    showPopup(MilestonePopup, { _class: tracker.class.Milestone }, container, (value) => {
      if (value != null) {
        milestone = value
        dispatch('milestone', milestone._id)
      }
    })
  }

  function showMenu (ev?: Event): void {
    if (milestone) {
      showPopup(ContextMenu, { object: milestone }, (ev as MouseEvent).target as HTMLElement)
    }
  }

  $: $activeMilestone = milestone?._id

  onDestroy(() => {
    $activeMilestone = undefined
  })
</script>

<IssuesView
  query={{ milestone: milestone._id, space: milestone.space }}
  space={milestone.space}
  label={milestone.label}
>
  <svelte:fragment slot="label_selector">
    <div bind:this={container}>
      <Button size={'small'} kind={'link'} on:click={selectMilestone}>
        <svelte:fragment slot="content">
          <div class="ac-header__icon"><Icon icon={tracker.icon.Milestone} size={'small'} /></div>
          <span class="ac-header__title mr-1">{milestone.label}</span>
          <Icon icon={Expanded} size={'small'} />
        </svelte:fragment>
      </Button>
    </div>
  </svelte:fragment>
  <svelte:fragment slot="afterHeader">
    <div class="p-1 ml-6 flex-row-center">
      <div class="flex-row-center">
        <DatePresenter value={milestone.targetDate} kind={'transparent'} />
      </div>
      <div class="flex-row-center ml-2">
        {#if milestone?.capacity}
          <Label label={tracker.string.CapacityValue} params={{ value: milestone?.capacity }} />
        {/if}
        <Button icon={IconMoreH} kind={'transparent'} size={'medium'} on:click={showMenu} />
      </div>
    </div>
  </svelte:fragment>
  <svelte:fragment slot="aside">
    <div class="flex-grow p-4 w-60 left-divider">
      <div class="fs-title text-xl">
        <EditBox bind:value={milestone.label} on:change={() => change('label', milestone.label)} />
      </div>
      <div class="mt-2">
        <StyledTextBox
          alwaysEdit={true}
          showButtons={false}
          placeholder={tracker.string.Description}
          content={milestone.description ?? ''}
          on:value={(evt) => change('description', evt.detail)}
        />
      </div>
      <DocAttributeBar object={milestone} mixins={[]} ignoreKeys={['icon', 'label', 'description']} />
    </div>
  </svelte:fragment>
</IssuesView>
