<script lang="ts">
  import { Card } from '@anticrm/board'
  import { TagElement } from '@anticrm/tags'
  import CardLabelsEditor from './CardLabelsEditor.svelte'
  import CardLabelsPicker from './CardLabelsPicker.svelte'

  export let value: Card

  let editMode: {
    isEdit?: boolean
    object?: TagElement
  } = {}
  let search: string | undefined = undefined

  function setEditMode (isEdit: boolean, object?: TagElement) {
    editMode = { isEdit, object }
  }
</script>

{#if editMode.isEdit}
  <CardLabelsEditor on:close object={editMode.object} onBack={() => setEditMode(false, undefined)} />
{:else}
  <CardLabelsPicker
    bind:search
    on:close
    object={value}
    onCreate={() => setEditMode(true, undefined)}
    onEdit={(o) => setEditMode(true, o)}
  />
{/if}
