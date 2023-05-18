<script lang="ts">
  import { getClient } from '@hcengineering/presentation'
  import { Milestone } from '@hcengineering/tracker'
  import { EditBox } from '@hcengineering/ui'
  import { createEventDispatcher, onMount } from 'svelte'
  import tracker from '../../plugin'

  export let object: Milestone

  const dispatch = createEventDispatcher()
  const client = getClient()

  let oldLabel = ''
  let rawLabel = ''

  function change<K extends keyof Milestone> (field: K, value: Milestone[K]) {
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
  placeholder={tracker.string.MilestoneNamePlaceholder}
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
