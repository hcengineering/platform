<script lang="ts">
  import { Ref } from '@hcengineering/core'
  import presentation, { createQuery, getClient } from '@hcengineering/presentation'
  import { Process, State, Transition, Trigger } from '@hcengineering/process'
  import { clearSettingsStore } from '@hcengineering/setting-resources'
  import {
    ButtonIcon,
    Component,
    Dropdown,
    DropdownIntlItem,
    DropdownLabelsIntl,
    IconDelete,
    Label,
    ListItem,
    Modal
  } from '@hcengineering/ui'
  import plugin from '../../plugin'
  import TransitionPresenter from './TransitionPresenter.svelte'

  export let readonly: boolean
  export let process: Process
  export let transition: Transition

  let params = transition.triggerParams ?? {}

  const client = getClient()

  let states: State[] = []
  const statesQuery = createQuery()

  $: process &&
    statesQuery.query(plugin.class.State, { process: process?._id }, (res) => {
      states = res
    })

  async function save (): Promise<void> {
    await client.update(transition, { triggerParams: params, trigger: selectedTrigger })
    clearSettingsStore()
  }

  async function remove (): Promise<void> {
    await client.remove(transition)
    clearSettingsStore()
  }

  function change (e: CustomEvent<Record<string, any>>): void {
    if (e.detail?.params !== undefined) {
      params = e.detail.params
    }
  }

  let selectedTrigger: Ref<Trigger> = transition.trigger
  $: trigger = client.getModel().findObject(selectedTrigger)

  const triggers = client.getModel().findAllSync(plugin.class.Trigger, { init: transition.from === null })

  const triggersItems: DropdownIntlItem[] = triggers.map((p) => ({ label: p.label, id: p._id, icon: p.icon }))

  let statesItems: ListItem[] = []
  $: statesItems = states.map((s) => ({ label: s.title, _id: s._id }))

  let fromState: ListItem | undefined
  $: fromState = statesItems.find((s) => s._id === (transition?.from as string))

  let toState: ListItem | undefined
  $: toState = statesItems.find((s) => s._id === (transition?.to as string))

  $: withoutFrom =
    process &&
    client.getModel().findAllSync(plugin.class.Transition, { from: null, process: process._id })[0] === undefined

  async function updateFrom (e: CustomEvent<ListItem>): Promise<void> {
    if (transition === undefined) return
    const from = (e.detail?._id as Ref<State>) ?? null
    await client.update(transition, { from })
  }

  async function updateTo (e: CustomEvent<ListItem>): Promise<void> {
    if (transition === undefined) return
    const to = e.detail?._id as Ref<State>
    if (to === undefined) return
    await client.update(transition, { to })
  }
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
      <div class="editor-grid">
        <Label label={plugin.string.From} />
        {#if !withoutFrom || transition.from === null}
          <Dropdown
            items={statesItems}
            selected={fromState}
            placeholder={plugin.string.From}
            justify={'left'}
            width={'100%'}
            kind={'no-border'}
            on:selected={updateFrom}
          />
        {:else}
          <div>⦳</div>
        {/if}
        <Label label={plugin.string.To} />
        <Dropdown
          items={statesItems}
          selected={toState}
          placeholder={plugin.string.To}
          justify={'left'}
          width={'100%'}
          kind={'no-border'}
          on:selected={updateTo}
        />
        <Label label={plugin.string.Trigger} />
        <DropdownLabelsIntl
          items={triggersItems}
          bind:selected={selectedTrigger}
          label={plugin.string.Trigger}
          on:selected={() => {
            params = {}
          }}
          justify={'left'}
          width={'100%'}
          kind={'no-border'}
        />
      </div>
      {#if trigger.editor !== undefined}
        <Component is={trigger.editor} props={{ process, params, readonly }} on:change={change} />
      {/if}
    {/if}
  </div>
</Modal>

<style lang="scss">
  .header {
    padding-left: 2rem;
  }

  .title {
    padding-bottom: 1rem;
  }
</style>
