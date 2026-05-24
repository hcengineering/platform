<!--
// Copyright © 2026 Hardcore Engineering Inc.
-->
<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import { Button, CheckBox, EditBox } from '@hcengineering/ui'
  import { getEmbeddedLabel } from '@hcengineering/platform'

  export let column:
    | 'name'
    | 'region'
    | 'mode'
    | 'last_visit'
    | 'attempts'
    | 'backup_size'
    | 'backup_age'
  export let current: any = undefined
  export let regions: Array<{ id: string, label: string }> = []

  const dispatch = createEventDispatcher()

  // Per-column working state.
  let textValue: string =
    column === 'name' ? (current?.nameContains ?? '') : ''
  let numA: number | null = current?.min ?? null
  let numB: number | null = current?.max ?? null
  // Multi-select sets:
  let selRegions = new Set<string>(current?.regions ?? [])
  let selModes = new Set<string>(current?.modes ?? [])

  const modeItems = [
    { id: 'active', label: 'Active' },
    { id: 'archived', label: 'Archived' },
    { id: 'deleting', label: 'Deleting' },
    { id: 'deleted', label: 'Deleted' },
    { id: 'upgrading', label: 'Upgrading' },
    { id: 'migration', label: 'Migration' },
    { id: 'restoring', label: 'Restoring' }
  ]

  function toggleSet (s: Set<string>, key: string): Set<string> {
    const n = new Set(s)
    if (n.has(key)) n.delete(key); else n.add(key)
    return n
  }

  function onApply (): void {
    let payload: any
    switch (column) {
      case 'name':
        payload = { nameContains: textValue.trim() !== '' ? textValue.trim() : undefined }
        if (payload.nameContains == null) payload = 'clear'
        break
      case 'region':
        payload = selRegions.size > 0 ? { regions: [...selRegions] } : 'clear'
        break
      case 'mode':
        payload = selModes.size > 0 ? { modes: [...selModes] } : 'clear'
        break
      case 'last_visit':
      case 'attempts':
      case 'backup_size':
      case 'backup_age':
        if ((numA == null || isNaN(numA)) && (numB == null || isNaN(numB))) {
          payload = 'clear'
        } else {
          payload = {
            min: numA != null && !isNaN(numA) ? numA : undefined,
            max: numB != null && !isNaN(numB) ? numB : undefined
          }
        }
        break
    }
    dispatch('close', { column, payload })
  }

  function onClear (): void {
    dispatch('close', { column, payload: 'clear' })
  }
</script>

<div class="filter-popup" data-drawer-keep-open>
  {#if column === 'name'}
    <EditBox bind:value={textValue} placeholder={getEmbeddedLabel('Name contains…')} kind={'editbox'} />
  {:else if column === 'region'}
    <div class="opts">
      {#each regions as r}
        <label class="opt">
          <CheckBox
            checked={selRegions.has(r.id)}
            on:value={() => { selRegions = toggleSet(selRegions, r.id) }}
          />
          <span>{r.label}</span>
        </label>
      {/each}
    </div>
  {:else if column === 'mode'}
    <div class="opts">
      {#each modeItems as m}
        <label class="opt">
          <CheckBox
            checked={selModes.has(m.id)}
            on:value={() => { selModes = toggleSet(selModes, m.id) }}
          />
          <span>{m.label}</span>
        </label>
      {/each}
    </div>
  {:else if column === 'last_visit'}
    <div class="row-pair">
      <label>
        <span>Min days</span>
        <input type="number" bind:value={numA} min="0" />
      </label>
      <label>
        <span>Max days</span>
        <input type="number" bind:value={numB} min="0" />
      </label>
    </div>
  {:else if column === 'attempts'}
    <div class="row-pair">
      <label>
        <span>Min</span>
        <input type="number" bind:value={numA} min="0" />
      </label>
      <label>
        <span>Max</span>
        <input type="number" bind:value={numB} min="0" />
      </label>
    </div>
  {:else if column === 'backup_size'}
    <div class="row-pair">
      <label>
        <span>Min MB</span>
        <input type="number" bind:value={numA} min="0" />
      </label>
      <label>
        <span>Max MB</span>
        <input type="number" bind:value={numB} min="0" />
      </label>
    </div>
  {:else if column === 'backup_age'}
    <div class="row-pair">
      <label>
        <span>Min hours</span>
        <input type="number" bind:value={numA} min="0" />
      </label>
      <label>
        <span>Max hours</span>
        <input type="number" bind:value={numB} min="0" />
      </label>
    </div>
  {/if}

  <div class="actions">
    <Button kind={'ghost'} size={'small'} label={getEmbeddedLabel('Clear')} on:click={onClear} />
    <Button kind={'primary'} size={'small'} label={getEmbeddedLabel('Apply')} on:click={onApply} />
  </div>
</div>

<style lang="scss">
  .filter-popup {
    background: var(--theme-popup-color);
    border: 1px solid var(--theme-popup-divider);
    border-radius: 0.5rem;
    box-shadow: 0 10px 28px rgba(0, 0, 0, 0.16);
    padding: 0.75rem;
    min-width: 240px;
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }

  .opts {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    max-height: 240px;
    overflow-y: auto;
  }

  .opt {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    font-size: 0.85rem;
    color: var(--theme-content-color);
    cursor: pointer;
  }

  .row-pair {
    display: flex;
    gap: 0.55rem;

    label {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
      font-size: 0.72rem;
      color: var(--theme-darker-color);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    input {
      width: 5.5rem;
      padding: 0.3rem 0.4rem;
      background: var(--theme-bg-color);
      color: var(--theme-content-color);
      border: 1px solid var(--theme-divider-color);
      border-radius: 0.35rem;
      font-size: 0.85rem;
    }
  }

  .actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.4rem;
  }
</style>
