<script lang="ts">
  import { AttachmentStyleBoxEditor } from '@hcengineering/attachment-resources'
  import { getClient } from '@hcengineering/presentation'
  import { Component } from '@hcengineering/tracker'
  import { EditBox, Label } from '@hcengineering/ui'
  import { createEventDispatcher, onMount } from 'svelte'
  import tracker from '../../plugin'
  import QueryIssuesList from '../issues/edit/QueryIssuesList.svelte'

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

  onMount(() => dispatch('open', { ignoreKeys: ['label', 'description', 'attachments'] }))

  $: descriptionKey = client.getHierarchy().getAttribute(tracker.class.Component, 'description')
  let descriptionBox: AttachmentStyleBoxEditor
</script>

<EditBox
  bind:value={rawLabel}
  placeholder={tracker.string.Component}
  kind="large-style"
  on:blur={() => {
    const trimmedLabel = rawLabel.trim()

    if (trimmedLabel.length === 0) {
      rawLabel = oldLabel
    } else if (trimmedLabel !== object.label) {
      change('label', trimmedLabel)
    }
  }}
/>

<div class="w-full mt-6">
  <AttachmentStyleBoxEditor
    focusIndex={30}
    {object}
    key={{ key: 'description', attr: descriptionKey }}
    bind:this={descriptionBox}
    placeholder={tracker.string.IssueDescriptionPlaceholder}
  />
</div>

<div class="w-full mt-6">
  <QueryIssuesList
    focusIndex={50}
    {object}
    query={{ component: object._id }}
    shouldSaveDraft
    hasSubIssues={true}
    viewletId={tracker.viewlet.ComponentIssuesList}
    createParams={{ component: object._id }}
    on:docs
  >
    <svelte:fragment slot="header">
      <Label label={tracker.string.Issues} />
    </svelte:fragment>
  </QueryIssuesList>
</div>
