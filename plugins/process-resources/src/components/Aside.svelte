<script lang="ts">
  import { Doc, DocumentUpdate } from '@hcengineering/core'
  import presentation, { getClient } from '@hcengineering/presentation'
  import { Process, type State, type Step } from '@hcengineering/process'
  import { clearSettingsStore } from '@hcengineering/setting-resources'
  import { ButtonIcon, IconDelete, Modal } from '@hcengineering/ui'
  import plugin from '../plugin'
  import StepEditor from './StepEditor.svelte'

  export let process: Process
  export let value: State
  export let index: number

  let step: Step<Doc> | undefined | null = undefined
  $: step = index === -1 ? value.endAction : value.actions[index]
  const client = getClient()

  async function save (): Promise<void> {
    const update: DocumentUpdate<State> = {}
    if (index !== -1) {
      update.actions = value.actions
    } else {
      update.endAction = value.endAction
    }
    await client.update(value, update)
    clearSettingsStore()
  }

  async function remove (): Promise<void> {
    const actions = value.actions.filter((it, idx) => idx !== index)
    await client.update(value, { actions })
    clearSettingsStore()
  }

  function change (e: CustomEvent<Step<Doc>>): void {
    if (index !== -1) {
      value.actions[index] = e.detail
    } else {
      value.endAction = e.detail
    }
  }
</script>

<Modal
  label={plugin.string.Step}
  type={'type-aside'}
  okLabel={presentation.string.Save}
  okAction={save}
  canSave={true}
  showCancelButton={false}
  onCancel={clearSettingsStore}
>
  <svelte:fragment slot="actions">
    {#if index !== -1}
      <ButtonIcon icon={IconDelete} size={'small'} kind={'tertiary'} on:click={remove} />
    {/if}
  </svelte:fragment>
  {#if step != null}
    <StepEditor {step} bind:state={value} {process} on:change={change} />
  {/if}
</Modal>
