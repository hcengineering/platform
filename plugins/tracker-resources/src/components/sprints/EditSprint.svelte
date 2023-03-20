<script lang="ts">
  import { getClient } from '@hcengineering/presentation'
  import { StyledTextBox } from '@hcengineering/text-editor'
  import { Sprint } from '@hcengineering/tracker'
  import { Button, DatePresenter, EditBox, Icon, IconMoreH, Label, showPopup } from '@hcengineering/ui'
  import { ContextMenu, DocAttributeBar } from '@hcengineering/view-resources'
  import { createEventDispatcher } from 'svelte'
  import { onDestroy } from 'svelte'
  import { activeSprint } from '../../issues'
  import tracker from '../../plugin'
  import { getDayOfSprint } from '../../utils'
  import Expanded from '../icons/Expanded.svelte'
  import IssuesView from '../issues/IssuesView.svelte'
  import SprintPopup from './SprintPopup.svelte'

  export let sprint: Sprint

  const client = getClient()
  const dispatch = createEventDispatcher()

  async function change (field: string, value: any) {
    await client.update(sprint, { [field]: value })
  }
  let container: HTMLElement

  function selectSprint (): void {
    showPopup(SprintPopup, { _class: tracker.class.Sprint }, container, (value) => {
      if (value != null) {
        sprint = value
        dispatch('sprint', sprint._id)
      }
    })
  }

  function showMenu (ev?: Event): void {
    if (sprint) {
      showPopup(ContextMenu, { object: sprint }, (ev as MouseEvent).target as HTMLElement)
    }
  }

  $: $activeSprint = sprint?._id

  onDestroy(() => {
    $activeSprint = undefined
  })
</script>

<IssuesView query={{ sprint: sprint._id, space: sprint.space }} space={sprint.space} label={sprint.label}>
  <svelte:fragment slot="label_selector">
    <div bind:this={container}>
      <Button size={'small'} kind={'link'} on:click={selectSprint}>
        <svelte:fragment slot="content">
          <div class="ac-header__icon"><Icon icon={tracker.icon.Sprint} size={'small'} /></div>
          <span class="ac-header__title mr-1">{sprint.label}</span>
          <Icon icon={Expanded} size={'small'} />
        </svelte:fragment>
      </Button>
    </div>
  </svelte:fragment>
  <svelte:fragment slot="afterHeader">
    {@const now = Date.now()}
    <div class="p-1 ml-6 flex-row-center">
      <div class="flex-row-center">
        <DatePresenter value={sprint.startDate} kind={'transparent'} />
        <span class="p-1"> / </span><DatePresenter value={sprint.targetDate} kind={'transparent'} />
      </div>
      <div class="flex-row-center ml-2">
        <!-- Active sprint in time -->
        <Label
          label={tracker.string.SprintPassed}
          params={{
            from:
              now < sprint.startDate
                ? 0
                : now > sprint.targetDate
                ? getDayOfSprint(sprint.startDate, sprint.targetDate)
                : getDayOfSprint(sprint.startDate, now),
            to: getDayOfSprint(sprint.startDate, sprint.targetDate)
          }}
        />
        {#if sprint?.capacity}
          <Label label={tracker.string.CapacityValue} params={{ value: sprint?.capacity }} />
        {/if}
        <Button icon={IconMoreH} kind={'transparent'} size={'medium'} on:click={showMenu} />
      </div>
    </div>
  </svelte:fragment>
  <svelte:fragment slot="aside">
    <div class="flex-grow p-4 w-60 left-divider">
      <div class="fs-title text-xl">
        <EditBox bind:value={sprint.label} on:change={() => change('label', sprint.label)} />
      </div>
      <div class="mt-2">
        <StyledTextBox
          alwaysEdit={true}
          showButtons={false}
          placeholder={tracker.string.Description}
          content={sprint.description ?? ''}
          on:value={(evt) => change('description', evt.detail)}
        />
      </div>
      <DocAttributeBar object={sprint} mixins={[]} ignoreKeys={['icon', 'label', 'description']} />
    </div>
  </svelte:fragment>
</IssuesView>
