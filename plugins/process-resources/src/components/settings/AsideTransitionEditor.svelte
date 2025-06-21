<script lang="ts">
  import { Ref } from '@hcengineering/core'
  import presentation, { getClient } from '@hcengineering/presentation'
  import { Process, Transition, Trigger } from '@hcengineering/process'
  import { clearSettingsStore } from '@hcengineering/setting-resources'
  import {
    ButtonIcon,
    Component,
    DropdownIntlItem,
    DropdownLabelsIntl,
    IconDelete,
    Label,
    Modal
  } from '@hcengineering/ui'
  import plugin from '../../plugin'
  import TransitionPresenter from './TransitionPresenter.svelte'

  export let readonly: boolean
  export let process: Process
  export let transition: Transition

  let params = transition.triggerParams

  const client = getClient()

  async function save (): Promise<void> {
    await client.update(transition, { triggerParams: params, trigger: selectedTrigger })
    clearSettingsStore()
  }

  async function remove (): Promise<void> {
    await client.remove(transition)
    clearSettingsStore()
  }

  function change (e: CustomEvent<Record<string, any>>): void {
    params = e.detail
  }

  let selectedTrigger: Ref<Trigger> = transition.trigger
  $: trigger = client.getModel().findObject(selectedTrigger)

  const triggers = client.getModel().findAllSync(plugin.class.Trigger, { init: transition.from === null })

  const triggersItems: DropdownIntlItem[] = triggers.map((p) => ({ label: p.label, id: p._id, icon: p.icon }))
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
  <div class="content clear-mins">
    <div class="header">
      <div class="fs-title title text-xl">
        <TransitionPresenter {transition} />
      </div>
    </div>
    <div class="grid">
      {#if trigger !== undefined}
        <Label label={plugin.string.Trigger} />
        <DropdownLabelsIntl
          items={triggersItems}
          bind:selected={selectedTrigger}
          label={plugin.string.Trigger}
          justify={'left'}
          width={'100%'}
          kind={'no-border'}
        />
        {#if trigger.editor !== undefined}
          <Component is={trigger.editor} props={{ process, params, readonly }} on:change={change} />
        {/if}
      {/if}
    </div>
  </div>
</Modal>

<style lang="scss">
  .header {
    padding: 1rem 1.25rem 2rem 1.25rem;
  }

  .grid {
    display: grid;
    grid-template-columns: 1fr 1.5fr;
    grid-auto-rows: minmax(2rem, max-content);
    justify-content: start;
    align-items: center;
    row-gap: 0.25rem;
    column-gap: 1rem;
    margin: 0.25rem 2rem 0;
    width: calc(100% - 4rem);
    height: min-content;
  }

  .title {
    padding-bottom: 1rem;
  }
</style>
