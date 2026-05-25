<!--
// Copyright © 2026 Hardcore Engineering Inc.
-->
<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte'
  import { ButtonMenu } from '@hcengineering/ui'
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

  // Issue 15: Single combined dropdown replacing the previous trio
  // (Apply preset / Save as preset… / Manage). Items are flat (the UI
  // DropdownIntlItem type has no `disabled`/`divider` field, so we
  // skip dividers entirely — apply / save / delete sit in one list).
  // Action prefix on the id lets a single on:selected handler route
  // to the right callback.
  $: menuItems = [
    ...presetNames.map((n) => ({ id: `apply::${n}`, label: getEmbeddedLabel(`Apply: ${n}`) })),
    { id: '__save', label: getEmbeddedLabel('Save current filter as preset…') },
    ...presetNames.map((n) => ({ id: `del::${n}`, label: getEmbeddedLabel(`Delete: ${n}`) }))
  ]

  function onSelected (e: CustomEvent<string | number>): void {
    const v = String(e.detail)
    if (v === '__save') { onSaveCurrent(); return }
    if (v.startsWith('apply::')) { onApply(v.slice(7)); return }
    if (v.startsWith('del::')) { onDelete(v.slice(5)) }
  }
</script>

<div class="filter-preset-menu" data-drawer-keep-open>
  <ButtonMenu
    items={menuItems}
    selected={''}
    title={'Presets'}
    kind={'secondary'}
    size={'small'}
    noSelection
    on:selected={onSelected}
  />
</div>

<style lang="scss">
  .filter-preset-menu {
    display: inline-flex;
    align-items: center;
  }
</style>
