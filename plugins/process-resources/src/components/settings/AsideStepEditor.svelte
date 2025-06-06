<script lang="ts">
  import { Class, Doc, Ref } from '@hcengineering/core'
  import presentation, { getClient } from '@hcengineering/presentation'
  import { Process, State, Transition, type Step } from '@hcengineering/process'
  import { clearSettingsStore } from '@hcengineering/setting-resources'
  import { ButtonIcon, IconDelete, Modal } from '@hcengineering/ui'
  import plugin from '../../plugin'
  import StepEditor from './StepEditor.svelte'

  export let readonly: boolean
  export let process: Process
  export let step: Step<Doc>
  export let _id: Ref<Transition | State>

  const client = getClient()

  async function save (): Promise<void> {
    const doc = client.getModel().findObject(_id)
    if (doc === undefined) return
    const index = doc.actions.findIndex((it) => it._id === step._id)
    if (index === -1) return
    doc.actions[index] = step
    await client.update(doc, { actions: doc.actions })
    clearSettingsStore()
  }

  async function remove (): Promise<void> {
    const doc = client.getModel().findObject(_id)
    if (doc === undefined) return
    const index = doc.actions.findIndex((it) => it._id === step._id)
    if (index === -1) return
    doc.actions.splice(index, 1)
    await client.update(doc, { actions: doc.actions })
    clearSettingsStore()
  }

  function change (e: CustomEvent<Step<Doc>>): void {
    step = e.detail
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
    {#if !readonly}
      <ButtonIcon icon={IconDelete} size={'small'} kind={'tertiary'} on:click={remove} />
    {/if}
  </svelte:fragment>
  {#if step != null}
    <StepEditor bind:step {process} on:change={change} />
  {/if}
</Modal>
