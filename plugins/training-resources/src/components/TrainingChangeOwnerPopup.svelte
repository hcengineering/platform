<!--
  Copyright @ 2024 Hardcore Engineering Inc.
-->

<script lang="ts">
  import type { Training } from '@hcengineering/training'
  import { AttributeBarEditor, Card, KeyedAttribute } from '@hcengineering/presentation'
  import training from '../plugin'
  import { canChangeTrainingOwner, changeTrainingOwner } from '../utils'
  import PanelTitle from './PanelTitle.svelte'

  export let object: Training

  let canChangeOwner = false
  $: canChangeOwner = canChangeTrainingOwner(object)

  let draft: Pick<Training, '_id' | 'owner'> = { _id: object._id, owner: object.owner }
  $: if (draft._id !== object._id) {
    draft = { _id: object._id, owner: object.owner }
  }

  let isSubmitting = false
  async function okAction (): Promise<void> {
    if (draft.owner === undefined) {
      return
    }

    isSubmitting = true
    await changeTrainingOwner(object, draft.owner)
    isSubmitting = false
  }

  let canSave = false
  $: canSave = canChangeOwner && !isSubmitting && draft.owner !== undefined && draft.owner !== object.owner

  function onUpdate (key: KeyedAttribute | string, value: any): void {
    const attrKey = typeof key === 'string' ? key : key.key
    draft[attrKey as keyof typeof draft] = value
  }
</script>

{#if canChangeOwner}
  <Card
    accentHeader
    thinHeader
    label={training.string.ChangeOwner}
    okLabel={training.string.ChangeOwner}
    {canSave}
    {okAction}
    width="x-small"
    on:close
  >
    <PanelTitle slot="subheader" training={object} />
    <div class="grid">
      <AttributeBarEditor
        draft
        kind="regular"
        width="max-content"
        object={draft}
        _class={object._class}
        key="owner"
        on:update={(event) => {
          onUpdate(event.detail.key, event.detail.value)
        }}
      />
    </div>
  </Card>
{/if}

<style lang="scss">
  .grid {
    display: grid;
    grid-template-columns: max-content 1fr;
    justify-content: start;
    align-items: center;
    row-gap: 1rem;
    column-gap: 1rem;
    width: 100%;
    height: min-content;
  }
</style>
