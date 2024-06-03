<!--
  Copyright @ 2024 Hardcore Engineering Inc.
-->

<script lang="ts">
  import { Label } from '@hcengineering/ui'
  import type { Training } from '@hcengineering/training'
  import { AttributeBarEditor, Card, KeyedAttribute } from '@hcengineering/presentation'
  import training from '../plugin'
  import { createTrainingRequest, type CreateTrainingRequestData } from '../utils'
  import PanelTitle from './PanelTitle.svelte'
  import TrainingRequestRolesEditor from './TrainingRequestRolesEditor.svelte'

  export let parent: Training
  export let object: CreateTrainingRequestData

  let isSubmitting = false
  let canSave = false
  $: canSave =
    !isSubmitting &&
    object.trainees.length + object.roles.length > 0 &&
    (object.dueDate === null || object.dueDate > Date.now()) &&
    (object.maxAttempts === null || object.maxAttempts > 0)

  async function okAction (): Promise<void> {
    isSubmitting = true
    await createTrainingRequest(parent, object)
    isSubmitting = false
  }

  function onUpdate (key: KeyedAttribute | string, value: any): void {
    const attrKey = typeof key === 'string' ? key : key.key
    object[attrKey as keyof typeof object] = value
  }
</script>

<Card
  accentHeader
  thinHeader
  label={training.string.TrainingRequestAssign}
  {canSave}
  {okAction}
  okLabel={training.string.TrainingRequestAssign}
  width="x-small"
  on:close
>
  <PanelTitle slot="subheader" training={parent} />
  <div class="grid">
    <span class="labelOnPanel">
      <Label label={training.string.TrainingRequestRoles} />
    </span>
    <div class="flex flex-grow min-w-0">
      <TrainingRequestRolesEditor
        kind="regular"
        width="max-content"
        value={object.roles}
        onChange={(roles) => {
          object.roles = roles
        }}
      />
    </div>

    <AttributeBarEditor
      draft
      kind="regular"
      width="max-content"
      {object}
      on:update={(event) => {
        onUpdate(event.detail.key, event.detail.value)
      }}
      _class={training.class.TrainingRequest}
      key="trainees"
    />
    <AttributeBarEditor
      draft
      kind="regular"
      width="max-content"
      {object}
      on:update={(event) => {
        onUpdate(event.detail.key, event.detail.value)
      }}
      _class={training.class.TrainingRequest}
      key="dueDate"
    />
    <AttributeBarEditor
      draft
      width="max-content"
      kind="regular"
      {object}
      on:update={(event) => {
        onUpdate(event.detail.key, event.detail.value)
      }}
      _class={training.class.TrainingRequest}
      key="maxAttempts"
    />
  </div>
</Card>

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
