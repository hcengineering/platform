<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import { Label, Button, Status as StatusControl } from '@anticrm/ui'
  import { getClient } from '@anticrm/presentation'
  import { Class, Client, Doc, DocumentUpdate, Ref } from '@anticrm/core'
  import { getResource, OK, Resource, Status } from '@anticrm/platform'
  import { Card } from '@anticrm/board'
  import view from '@anticrm/view'
  import board from '../../plugin'
  import SpaceSelect from '../selectors/SpaceSelect.svelte'
  import StateSelect from '../selectors/StateSelect.svelte'
  import RankSelect from '../selectors/RankSelect.svelte'
  import { createMissingLabels } from '../../utils/BoardUtils'

  export let object: Card

  const client = getClient()
  const hierarchy = client.getHierarchy()
  const dispatch = createEventDispatcher()
  let status: Status = OK
  const selected = {
    space: object.space,
    state: object.state,
    rank: object.rank
  }

  async function move(): Promise<void> {
    const update: DocumentUpdate<Card> = {}

    if (selected.space !== object.space) {
      update.labels = await createMissingLabels(client, object, selected.space)
      update.space = selected.space
    }

    if (selected.state !== object.state) update.state = selected.state
    if (selected.rank !== object.rank) update.rank = selected.rank
    client.update(object, update)
    dispatch('close')
  }

  async function invokeValidate (
    action: Resource<<T extends Doc>(doc: T, client: Client) => Promise<Status>>
  ): Promise<Status> {
    const impl = await getResource(action)
    return await impl(object, client)
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

  $: validate({ ...object, ...selected }, object._class)
</script>

<div class="antiPopup antiPopup-withHeader antiPopup-withTitle antiPopup-withCategory w-85">
  <div class="ap-space" />
  <div class="fs-title ap-header flex-row-center">
    <Label label={board.string.MoveCard} />
  </div>
  <div class="ap-space bottom-divider" />
  <StatusControl {status} />
  <div class="ap-title">
    <Label label={board.string.SelectDestination} />
  </div>
  <div class="ap-category">
    <div class="categoryItem w-full border-radius-2 p-2 background-button-bg-enabled">
      <SpaceSelect label={board.string.Board} {object} bind:selected={selected.space} />
    </div>
  </div>
  <div class="ap-category flex-gap-3">
    <div class="categoryItem w-full border-radius-2 p-2 background-button-bg-enabled">
      {#key selected.space}
        <StateSelect label={board.string.List} {object} space={selected.space} bind:selected={selected.state} />
      {/key}
    </div>
    <div class="categoryItem w-full border-radius-2 p-2 background-button-bg-enabled">
      {#key selected.state}
        <RankSelect label={board.string.Position} {object} state={selected.state} bind:selected={selected.rank} />
      {/key}
    </div>
  </div>
  <div class="ap-footer">
    <Button
      size={'small'}
      label={board.string.Cancel}
      on:click={() => {
        dispatch('close')
      }}
    />
    <Button
      label={board.string.Move}
      size={'small'}
      disabled={status !== OK || (object.state === selected.state && object.rank === selected.rank)}
      kind={'primary'}
      on:click={move}
    />
  </div>
</div>
