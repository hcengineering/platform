<!--
  Copyright © 2023 Hardcore Engineering Inc.
-->

<script lang="ts">
  import { EditBox } from '@hcengineering/ui'
  import { Card } from '@hcengineering/presentation'
  import training from '../plugin'

  import { canCreateTraining, createTraining, type CreateTrainingData } from '../utils'

  const object: CreateTrainingData = {
    title: '',
    description: '',
    attachments: 0,
    passingScore: 100.0,
    releasedOn: null,
    releasedBy: null,
    questions: 0,
    requests: 0
  }

  let isSubmitting = false
  let canSave = false
  $: canSave = canCreateTraining() && !isSubmitting && object.title.length > 0

  async function okAction (): Promise<void> {
    isSubmitting = true
    await createTraining(object)
    isSubmitting = false
  }
</script>

<Card accentHeader thinHeader label={training.string.TrainingCreate} {canSave} {okAction} on:close>
  <EditBox focusIndex={1} bind:value={object.title} kind="large-style" autoFocus fullSize disabled={isSubmitting} />
</Card>
