<script lang="ts">
  import { getClient } from '@anticrm/presentation'
  import { StyledTextBox } from '@anticrm/text-editor'
  import { Sprint } from '@anticrm/tracker'
  import { Button, EditBox, Icon, showPopup } from '@anticrm/ui'
  import { DocAttributeBar } from '@anticrm/view-resources'
  import { onDestroy } from 'svelte'
  import { activeSprint } from '../../issues'
  import tracker from '../../plugin'
  import Expanded from '../icons/Expanded.svelte'
  import IssuesView from '../issues/IssuesView.svelte'
  import SprintPopup from './SprintPopup.svelte'

  export let sprint: Sprint

  const client = getClient()

  async function change (field: string, value: any) {
    await client.update(sprint, { [field]: value })
  }
  let container: HTMLElement
  function selectSprint (evt: MouseEvent): void {
    showPopup(SprintPopup, { _class: tracker.class.Sprint }, container, (value) => {
      if (value != null) {
        sprint = value
      }
    })
  }

  $: $activeSprint = sprint?._id

  onDestroy(() => {
    $activeSprint = undefined
  })
</script>

<IssuesView query={{ sprint: sprint._id, space: sprint.space }} label={sprint.label}>
  <svelte:fragment slot="label_selector">
    <div bind:this={container}>
      <Button size={'small'} kind={'link'} on:click={selectSprint}>
        <svelte:fragment slot="content">
          <div class="ac-header__icon"><Icon icon={tracker.icon.Issues} size={'small'} /></div>
          <span class="ac-header__title mr-1">{sprint.label}</span>
          <Icon icon={Expanded} size={'small'} />
        </svelte:fragment>
      </Button>
    </div>
  </svelte:fragment>
  <svelte:fragment slot="aside">
    <div class="flex-grow p-4 w-60 left-divider">
      <div class="fs-title text-xl">
        <EditBox bind:value={sprint.label} maxWidth="39rem" on:change={() => change('label', sprint.label)} />
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
