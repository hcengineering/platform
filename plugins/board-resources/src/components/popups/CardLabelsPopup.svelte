<script lang="ts">
  import { Card, CardLabel } from '@anticrm/board'
  import { createEventDispatcher } from 'svelte'

  import CardLabelsEditor from './CardLabelsEditor.svelte'
  import CardLabelsPicker from './CardLabelsPicker.svelte'

  export let object: Card

  let editMode: {
    isEdit?: boolean
    object?: CardLabel
  } = {}
  let search: string | undefined = undefined
  const dispatch = createEventDispatcher()

  function setEditMode (isEdit: boolean, object?: CardLabel) {
    editMode = { isEdit, object }
  }

  function close () {
    dispatch('close')
  }

</script>

{#if editMode.isEdit}
  <CardLabelsEditor
    on:close
    boardRef={object.space}
    object={editMode.object}
    onBack={() => setEditMode(false, undefined)} />
{:else}
  <CardLabelsPicker
    bind:search
    on:close
    {object}
    onCreate={() => setEditMode(true, undefined)}
    onEdit={(o) => setEditMode(true, o)} />
{/if}
