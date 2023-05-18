<script lang="ts">
  import { getClient } from '@hcengineering/presentation'
  import { Component } from '@hcengineering/tracker'
  import { EditBox } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import tracker from '../../plugin'
  import { onMount } from 'svelte'

  export let object: Component

  const client = getClient()
  const dispatch = createEventDispatcher()

  let oldLabel = ''
  let rawLabel = ''

  function change<K extends keyof Component> (field: K, value: Component[K]) {
    client.update(object, { [field]: value })
  }

  $: if (oldLabel !== object.label) {
    oldLabel = object.label
    rawLabel = object.label
  }

  onMount(() => dispatch('open', { ignoreKeys: ['label'] }))
</script>

<EditBox
  bind:value={rawLabel}
  placeholder={tracker.string.Component}
  kind="large-style"
  focusable
  on:blur={() => {
    const trimmedLabel = rawLabel.trim()

    if (trimmedLabel.length === 0) {
      rawLabel = oldLabel
    } else if (trimmedLabel !== object.label) {
      change('label', trimmedLabel)
    }
  }}
/>
