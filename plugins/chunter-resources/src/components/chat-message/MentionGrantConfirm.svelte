<!--
// Copyright © 2026 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
-->
<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import { Button, CheckBox, Label } from '@hcengineering/ui'
  import { getEmbeddedLabel } from '@hcengineering/platform'

  // One entry per NEW grantee (people not already members of the grant-target space).
  export let grantees: Array<{ id: string, name: string }>
  export let targetName: string
  export let spaceName: string

  const dispatch = createEventDispatcher()

  // Default: grant everyone (preserves pre-V3 behaviour). A plain array with
  // per-row `granted` so `bind:checked` stays reactive (mutating a Map would
  // not re-render the CheckBox in Svelte 4).
  let rows = grantees.map((g) => ({ id: g.id, name: g.name, granted: true }))

  function onCancel (): void {
    dispatch('close', undefined) // undefined => caller treats as cancel
  }

  function onSend (): void {
    // Emit the full choice map so the caller can rewrite the markup.
    dispatch('close', new Map(rows.map((r) => [r.id, r.granted])))
  }
</script>

<div class="msgbox-container">
  <div class="overflow-label fs-title mb-4">
    <Label label={getEmbeddedLabel('This mention grants access')} />
  </div>
  <div class="mb-4">
    <Label
      label={getEmbeddedLabel(
        `Selected people will get read access to "${targetName}" in "${spaceName}" and the ability to comment. They cannot edit the document's fields. Uncheck anyone you do not want to grant access to.`
      )}
    />
  </div>
  {#each rows as row (row.id)}
    <div class="flex-row-center mb-2">
      <CheckBox bind:checked={row.granted} kind="primary" />
      <span class="ml-2 overflow-label">{row.name}</span>
    </div>
  {/each}
  <div class="flex-row-reverse mt-4">
    <Button
      label={getEmbeddedLabel('Send with selected grants')}
      kind="primary"
      on:click={onSend}
    />
    <div class="mr-2">
      <Button label={getEmbeddedLabel('Cancel')} on:click={onCancel} />
    </div>
  </div>
</div>

<style lang="scss">
  .msgbox-container {
    display: flex;
    flex-direction: column;
    padding: 1rem;
    min-width: 20rem;
    max-width: 30rem;
  }
</style>
