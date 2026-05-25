<!--
// Copyright © 2026 Hardcore Engineering Inc.
-->
<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte'
  import { Button, ButtonMenu } from '@hcengineering/ui'
  import { getEmbeddedLabel } from '@hcengineering/platform'

  // table key used as localStorage namespace ('users' or 'workspaces')
  export let storageKey: 'users' | 'workspaces'
  // current filter+sort state (caller responsible for capture)
  export let currentState: any

  const dispatch = createEventDispatcher<{
    apply: any
  }>()

  const STORAGE_KEY = `huly.admin.${storageKey}.presets`

  let presets: Record<string, any> = {}

  function load (): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      presets = raw != null ? JSON.parse(raw) : {}
    } catch {
      presets = {}
    }
  }

  function save (): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(presets))
  }

  function onSaveCurrent (): void {
    const name = window.prompt('Preset name:')?.trim()
    if (name == null || name === '') return
    presets = { ...presets, [name]: currentState }
    save()
  }

  function onApply (name: string): void {
    const p = presets[name]
    if (p == null) return
    dispatch('apply', p)
  }

  function onDelete (name: string): void {
    if (!window.confirm(`Delete preset "${name}"?`)) return
    const next = { ...presets }
    delete next[name]
    presets = next
    save()
  }

  onMount(load)

  $: presetNames = Object.keys(presets)
</script>

<div class="filter-preset-menu" data-drawer-keep-open>
  {#if presetNames.length > 0}
    <ButtonMenu
      items={presetNames.map((name) => ({ id: name, label: getEmbeddedLabel(name) }))}
      selected={''}
      title="Apply preset"
      on:selected={(e) => { onApply(e.detail) }}
    />
  {/if}
  <Button kind={'regular'} size={'small'} label={getEmbeddedLabel('Save as preset…')} on:click={onSaveCurrent} />
  {#if presetNames.length > 0}
    <ButtonMenu
      items={presetNames.map((name) => ({ id: name, label: getEmbeddedLabel(`Delete "${name}"`) }))}
      selected={''}
      title="Manage"
      on:selected={(e) => { onDelete(e.detail) }}
    />
  {/if}
</div>

<style lang="scss">
  .filter-preset-menu {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
  }
</style>
