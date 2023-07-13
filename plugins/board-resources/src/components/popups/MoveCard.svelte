<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import { Label, Status as StatusControl } from '@hcengineering/ui'
  import { Card as Popup, getClient } from '@hcengineering/presentation'
  import { Class, Client, Doc, DocumentUpdate, Ref } from '@hcengineering/core'
  import { getResource, OK, Resource, Status } from '@hcengineering/platform'
  import { Card } from '@hcengineering/board'
  import view from '@hcengineering/view'
  import board from '../../plugin'
  import SpaceSelect from '../selectors/SpaceSelect.svelte'
  import StateSelect from '../selectors/StateSelect.svelte'
  import RankSelect from '../selectors/RankSelect.svelte'

  export let value: Card

  const client = getClient()
  const hierarchy = client.getHierarchy()
  const dispatch = createEventDispatcher()
  let status: Status = OK
  const selected = {
    space: value.space,
    status: value.status,
    rank: value.rank
  }

  async function move (): Promise<void> {
    const update: DocumentUpdate<Card> = {}

    if (selected.space !== value.space) {
      update.space = selected.space
    }

    if (selected.status !== value.status) update.status = selected.status
    if (selected.rank !== value.rank) update.rank = selected.rank
    client.update(value, update)
    dispatch('close')
  }

  async function invokeValidate (
    action: Resource<<T extends Doc>(doc: T, client: Client) => Promise<Status>>
  ): Promise<Status> {
    const impl = await getResource(action)
    return await impl(value, client)
  }

  async function validate (doc: Doc, _class: Ref<Class<Doc>>): Promise<void> {
    const clazz = hierarchy.getClass(_class)
    const validatorMixin = hierarchy.as(clazz, view.mixin.ObjectValidator)
    if (validatorMixin?.validator != null) {
      status = await invokeValidate(validatorMixin.validator)
    } else if (clazz.extends != null) {
      await validate(doc, clazz.extends)
    } else {
      status = OK
    }
  }

  $: validate({ ...value, ...selected }, value._class)
</script>

<Popup
  label={board.string.MoveCard}
  canSave={status === OK && (value.status !== selected.status || value.rank !== selected.rank)}
  okAction={move}
  okLabel={board.string.Move}
  on:close={() => {
    dispatch('close')
  }}
>
  <StatusControl {status} />
  <div class="ap-title">
    <Label label={board.string.SelectDestination} />
  </div>
  <div class="w-full flex ml-2">
    <div style:flex-basis="10%" class="text-md">
      <Label label={board.string.Board} />
    </div>
    <SpaceSelect label={board.string.Board} object={value} bind:selected={selected.space} />
  </div>
  <div class="w-full flex ml-2">
    <div style:flex-basis="10%" class="text-md">
      <Label label={board.string.List} />
    </div>
    {#key selected.space}
      <StateSelect label={board.string.List} object={value} space={selected.space} bind:selected={selected.status} />
    {/key}
  </div>
  <div class="w-full flex ml-2">
    <div style:flex-basis="10%" class="text-md">
      <Label label={board.string.Position} />
    </div>
    {#key selected.status}
      <RankSelect label={board.string.Position} object={value} state={selected.status} bind:selected={selected.rank} />
    {/key}
  </div>
</Popup>
