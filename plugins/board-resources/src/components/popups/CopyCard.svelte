<script lang="ts">
  import attachment, { Attachment } from '@anticrm/attachment'
  import chunter, { Comment } from '@anticrm/chunter'
  import { createEventDispatcher, onMount } from 'svelte'
  import { Label, Button, Status as StatusControl, TextArea, CheckBox } from '@anticrm/ui'
  import { Class, Client, Doc, FindResult, Ref } from '@anticrm/core'
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
  import { createMissingLabels } from '../../utils/BoardUtils'

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

  let keepLabels = (object.labels?.length ?? 0) > 0 ? true : undefined
  let keepMembers = (object.members?.length ?? 0) > 0 ? true : undefined
  let keepAttachments = (object.attachments ?? 0) > 0 ? true : undefined
  let keepComments = (object.comments ?? 0) > 0 ? true : undefined

  async function copyCard(): Promise<void> {
    const newCardId = generateId() as Ref<Card>

    const sequence = await client.findOne(task.class.Sequence, { attachedTo: board.class.Card })
    if (sequence === undefined) {
      throw new Error('sequence object not found')
    }

    const incResult = await client.update(sequence, { $inc: { sequence: 1 } }, true)

    let labels = undefined
    if (keepLabels) {
      labels =
        object.space !== selected.space ? await createMissingLabels(client, object, selected.space) : object.labels
    }

    const value: AttachedData<Card> = {
      state: selected.state,
      doneState: null,
      number: (incResult as any).object.sequence,
      title: title,
      rank: selected.rank,
      assignee: null,
      description: '',
      members: keepMembers !== true ? undefined : object.members,
      location: '',
      labels,
      date: object.date
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

    if (keepAttachments) {
      const sourceAttachments = await client.findAll(attachment.class.Attachment, {
        space: object.space,
        attachedTo: object._id
      })

      for (let i = 0; i < sourceAttachments.total; i++) {
        const a = sourceAttachments[i]

        await client.addCollection(
          attachment.class.Attachment,
          selected.space,
          newCardId,
          board.class.Card,
          'attachments',
          {
            name: a.name,
            file: a.file,
            type: a.type,
            size: a.size,
            lastModified: a.lastModified
          }
        )
      }
    }

    if (keepComments) {
      const sourceComments = await client.findAll(chunter.class.Comment, {
        space: object.space,
        attachedTo: object._id
      })

      for (let i = 0; i < sourceComments.total; i++) {
        const comment = sourceComments[i]

        const commentAttachments =
          (comment.attachments ?? 0) > 0
            ? await client.findAll(attachment.class.Attachment, { space: object.space, attachedTo: comment._id })
            : ({ total: 0 } as FindResult<Attachment>)

        const newCommentId = generateId() as Ref<Comment>

        await client.addCollection(
          chunter.class.Comment,
          selected.space,
          newCardId,
          board.class.Card,
          'comments',
          {
            message: comment.message,
            attachments: comment.attachments
          },
          newCommentId
        )

        for (let j = 0; j < commentAttachments.total; j++) {
          const ca = commentAttachments[j]

          await client.addCollection(
            attachment.class.Attachment,
            selected.space,
            newCommentId,
            chunter.class.Comment,
            'attachments',
            {
              name: ca.name,
              file: ca.file,
              type: ca.type,
              size: ca.size,
              lastModified: ca.lastModified
            }
          )
        }
      }
    }

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
  {#if [keepLabels, keepMembers, keepAttachments, keepComments].some((keep) => keep !== undefined)}
    <div class="ap-title">
      <Label label={board.string.AlsoCopy} />
    </div>
    <div class="mr-4 ml-4 mt-2">
      {#if keepLabels !== undefined}
        <div class="flex-row-center">
          <CheckBox bind:checked={keepLabels} primary={true} />
          <div class="ml-2">
            <Label label={board.string.Labels} />
            {`(${object.labels?.length})`}
          </div>
        </div>
      {/if}
      {#if keepMembers !== undefined}
        <div class="flex-row-center">
          <CheckBox bind:checked={keepMembers} primary={true} />
          <div class="ml-2">
            <Label label={board.string.Members} />
            {`(${object.members?.length})`}
          </div>
        </div>
      {/if}
      {#if keepAttachments !== undefined}
        <div class="flex-row-center">
          <CheckBox bind:checked={keepAttachments} primary={true} />
          <div class="ml-2">
            <Label label={board.string.Attachments} />
            {`(${object.attachments})`}
          </div>
        </div>
      {/if}
      {#if keepComments !== undefined}
        <div class="flex-row-center">
          <CheckBox bind:checked={keepComments} primary={true} />
          <div class="ml-2">
            <Label label={board.string.Comments} />
            {`(${object.comments})`}
          </div>
        </div>
      {/if}
    </div>
  {/if}
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
