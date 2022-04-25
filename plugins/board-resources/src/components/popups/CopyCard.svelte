<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte'
  import { Label, Button, Status as StatusControl, TextArea } from '@anticrm/ui'
  import { Class, Client, Doc, Ref } from '@anticrm/core'
  import { getResource, OK, Resource, Status } from '@anticrm/platform'
  import { Card } from '@anticrm/board'
  import view from '@anticrm/view'
  import board from '../../plugin'
  import SpaceSelect from '../selectors/SpaceSelect.svelte'
  import StateSelect from '../selectors/StateSelect.svelte'
  import RankSelect from '../selectors/RankSelect.svelte'
  import type { TxOperations } from '@anticrm/core'
  import { generateId, AttachedData } from '@anticrm/core'
  import task from '@anticrm/task'

  export let object: Card
  export let client: TxOperations

  const hierarchy = client.getHierarchy()
  const dispatch = createEventDispatcher()

  let inputRef: TextArea
  let title = object.title
  let status: Status = OK
  const selected = {
    space: object.space,
    state: object.state,
    rank: object.rank
  }

  async function copyCard(): Promise<void> {
    const newCardId = generateId() as Ref<Card>

    const sequence = await client.findOne(task.class.Sequence, { attachedTo: board.class.Card })
    if (sequence === undefined) {
      throw new Error('sequence object not found')
    }

    const incResult = await client.update(sequence, { $inc: { sequence: 1 } }, true)

    const value: AttachedData<Card> = {
      state: selected.state,
      doneState: null,
      number: (incResult as any).object.sequence,
      title: title,
      rank: selected.rank,
      assignee: null,
      description: '',
      members: [],
      location: ''
    }

    await client.addCollection(
      board.class.Card,
      selected.space,
      selected.space,
      board.class.Board,
      'cards',
      value,
      newCardId
    )
    dispatch('close')
  }

  async function invokeValidate(
    action: Resource<<T extends Doc>(doc: T, client: Client) => Promise<Status>>
  ): Promise<Status> {
    const impl = await getResource(action)
    return await impl(object, client)
  }

  async function validate(doc: Doc, _class: Ref<Class<Doc>>): Promise<void> {
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

  onMount(() => inputRef.focus())
</script>

<div class="antiPopup antiPopup-withHeader antiPopup-withTitle antiPopup-withCategory w-85">
  <div class="ap-space" />
  <div class="fs-title ap-header flex-row-center">
    <Label label={board.string.CopyCard} />
  </div>
  <div class="ap-space bottom-divider" />
  <StatusControl {status} />
  <div class="ap-title">
    <Label label={board.string.Title} />
  </div>
  <div class="mr-4 ml-4 mt-2">
    <TextArea bind:this={inputRef} bind:value={title} />
  </div>
  <div class="ap-title">
    <Label label={board.string.CopyTo} />
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
        <RankSelect
          label={board.string.Position}
          {object}
          state={selected.state}
          bind:selected={selected.rank}
          isCopying={true}
        />
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
      label={board.string.CreateCard}
      size={'small'}
      disabled={status !== OK}
      kind={'primary'}
      on:click={copyCard}
    />
  </div>
</div>
