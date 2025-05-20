<script lang="ts">
  import presentation, { getClient } from '@hcengineering/presentation'
  import { Process, Transition } from '@hcengineering/process'
  import { clearSettingsStore } from '@hcengineering/setting-resources'
  import { ButtonIcon, Component, IconDelete, Label, Modal } from '@hcengineering/ui'
  import plugin from '../../plugin'
  import TransitionPresenter from './TransitionPresenter.svelte'

  export let readonly: boolean
  export let process: Process
  export let transition: Transition

  let params = transition.triggerParams

  const client = getClient()

  const from = client.getModel().findObject(transition.from)
  const to = transition.to === null ? null : client.getModel().findObject(transition.to)

  async function save (): Promise<void> {
    await client.update(transition, { triggerParams: params })
    clearSettingsStore()
  }

  async function remove (): Promise<void> {
    await client.remove(transition)
    clearSettingsStore()
  }

  function change (e: CustomEvent<Record<string, any>>): void {
    params = e.detail
  }

  $: trigger = client.getModel().findObject(transition.trigger)
</script>

<Modal
  label={plugin.string.Transition}
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
  {#if trigger !== undefined}
    <div class="content clear-mins">
      <div class="header">
        <div class="fs-title title text-xl">
          <Label label={trigger.label} />
        </div>
        <TransitionPresenter {transition} />
      </div>
      {#if trigger.editor !== undefined}
        <Component is={trigger.editor} props={{ process, params, readonly }} on:change={change} />
      {/if}
    </div>
  {/if}
</Modal>

<style lang="scss">
  .header {
    padding: 1rem 1.25rem 2rem 1.25rem;
  }

  .title {
    padding-bottom: 1rem;
  }
</style>
