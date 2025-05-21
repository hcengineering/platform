<script lang="ts">
  import { Doc } from '@hcengineering/core'
  import presentation, { getClient } from '@hcengineering/presentation'
  import { Process, Step, StepId, Transition } from '@hcengineering/process'
  import { clearSettingsStore } from '@hcengineering/setting-resources'
  import {
    Button,
    ButtonIcon,
    Component,
    DropdownIntlItem,
    DropdownLabelsPopupIntl,
    getEventPositionElement,
    IconAdd,
    IconDelete,
    Label,
    Modal,
    showPopup
  } from '@hcengineering/ui'
  import plugin from '../../plugin'
  import { initState } from '../../utils'
  import ActionPresenter from './ActionPresenter.svelte'
  import StepEditor from './StepEditor.svelte'
  import TransitionPresenter from './TransitionPresenter.svelte'

  export let readonly: boolean
  export let process: Process
  export let transition: Transition

  let params = transition.triggerParams

  const client = getClient()

  async function save (): Promise<void> {
    await client.update(transition, { triggerParams: params, actions: transition.actions })
    clearSettingsStore()
  }

  async function remove (): Promise<void> {
    await client.remove(transition)
    clearSettingsStore()
  }

  function change (e: CustomEvent<Record<string, any>>): void {
    params = e.detail
  }

  function addAction (e: MouseEvent): void {
    const items: DropdownIntlItem[] = client
      .getModel()
      .findAllSync(plugin.class.Method, {})
      .map((x) => ({
        id: x._id,
        label: x.label
      }))

    showPopup(DropdownLabelsPopupIntl, { items }, getEventPositionElement(e), async (res) => {
      if (res !== undefined) {
        const step = await initState(res)
        transition.actions.push(step)
        transition.actions = transition.actions
        await client.update(transition, { actions: transition.actions })
      }
    })
  }

  $: trigger = client.getModel().findObject(transition.trigger)

  let expanded = new Set<StepId>()
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
    {#if trigger !== undefined}
      <div class="flex-col-center text-lg">
        <Label label={trigger.label} />
      </div>
      {#if trigger.editor !== undefined}
        <Component is={trigger.editor} props={{ process, params, readonly }} on:change={change} />
      {/if}
    {/if}
    <div class="divider" />
    <div class="flex-col flex-gap-2">
      {#each transition.actions as action}
        <Button
          justify="left"
          size="large"
          kind="regular"
          width="100%"
          on:click={() => {
            if (readonly) return
            expanded.has(action._id) ? expanded.delete(action._id) : expanded.add(action._id)
            expanded = expanded
          }}
        >
          <svelte:fragment slot="content">
            <ActionPresenter {action} {process} {readonly} />
          </svelte:fragment>
        </Button>
        {#if expanded.has(action._id)}
          <StepEditor bind:step={action} {process} withoutHeader />
        {/if}
      {/each}
      {#if !readonly}
        <Button kind={'ghost'} width={'100%'} icon={IconAdd} label={plugin.string.AddAction} on:click={addAction} />
      {/if}
    </div>
  </div>
</Modal>

<style lang="scss">
  .header {
    padding: 1rem 1.25rem 2rem 1.25rem;
  }

  .title {
    padding-bottom: 1rem;
  }

  .divider {
    border-bottom: 1px solid var(--theme-divider-color);
    margin: 1rem 0;
  }
</style>
