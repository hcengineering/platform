<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte'
  import { Label, Status as StatusControl, TextArea } from '@hcengineering/ui'
  import { Class, Client, Doc, Ref } from '@hcengineering/core'
  import { getResource, OK, Resource, Status } from '@hcengineering/platform'
  import { Card as Popup, getClient } from '@hcengineering/presentation'
  import { Card } from '@hcengineering/board'
  import view from '@hcengineering/view'
  import board from '../../plugin'
  import SpaceSelect from '../selectors/SpaceSelect.svelte'
  import StateSelect from '../selectors/StateSelect.svelte'
  import RankSelect from '../selectors/RankSelect.svelte'
  import { generateId, AttachedData } from '@hcengineering/core'
  import task from '@hcengineering/task'

  export let value: Card
  const client = getClient()

  const hierarchy = client.getHierarchy()
  const dispatch = createEventDispatcher()

  let inputRef: TextArea
  let title = value.title
  let status: Status = OK
  const selected = {
    space: value.space,
    status: value.status,
    rank: value.rank
  }

  async function copyCard (): Promise<void> {
    const newCardId = generateId() as Ref<Card>

    const sequence = await client.findOne(task.class.Sequence, { attachedTo: board.class.Card })
    if (sequence === undefined) {
      throw new Error('sequence object not found')
    }

    const incResult = await client.update(sequence, { $inc: { sequence: 1 } }, true)

    const copy: AttachedData<Card> = {
      status: selected.status,
      doneState: null,
      number: (incResult as any).object.sequence,
      title,
      rank: selected.rank,
      assignee: null,
      description: '',
      members: [],
      location: '',
      labels: value.labels,
      startDate: value.startDate,
      dueDate: value.dueDate
    }

    await client.addCollection(
      board.class.Card,
      selected.space,
      selected.space,
      board.class.Board,
      'cards',
      copy,
      newCardId
    )
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

  onMount(() => inputRef.focus())
</script>

<Popup
  label={board.string.CopyCard}
  canSave={status === OK}
  okAction={copyCard}
  okLabel={board.string.CreateCard}
  on:close={() => {
    dispatch('close')
  }}
>
  <StatusControl {status} />
  <div class="ap-title">
    <Label label={board.string.Title} />
  </div>
  <div class="mt-2">
    <TextArea bind:this={inputRef} bind:value={title} />
  </div>
  <div class="ap-title">
    <Label label={board.string.CopyTo} />
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
      <RankSelect
        label={board.string.Position}
        object={value}
        state={selected.status}
        bind:selected={selected.rank}
        isCopying={true}
      />
    {/key}
  </div>
</Popup>
