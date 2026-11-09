<script lang="ts">
  import { AttachmentStyleBoxEditor } from '@hcengineering/attachment-resources'
  import { getClient, getDocRules } from '@hcengineering/presentation'
  import { Component } from '@hcengineering/tracker'
  import { EditBox, getPlatformColor, getPlatformColors, Label, showPopup, themeStore } from '@hcengineering/ui'
  import { createEventDispatcher, onMount } from 'svelte'
  import { ColorsPopup } from '@hcengineering/view-resources'
  import tracker from '../../plugin'
  import QueryIssuesList from '../issues/edit/QueryIssuesList.svelte'

  export let object: Component

  const client = getClient()
  const dispatch = createEventDispatcher()

  let oldLabel = ''
  let rawLabel = ''

  $: rulesQuery = getDocRules<Component>(object, 'label')

  function change<K extends keyof Component> (field: K, value: Component[K]): void {
    void client.update(object, { [field]: value })
  }

  $: if (oldLabel !== object.label) {
    oldLabel = object.label
    rawLabel = object.label
  }

  onMount(() => dispatch('open', { ignoreKeys: ['label', 'description', 'attachments'] }))

  $: descriptionKey = client.getHierarchy().getAttribute(tracker.class.Component, 'description')
  let descriptionBox: AttachmentStyleBoxEditor

  function hashFromId (id: string): number {
    let h = 0
    for (let i = 0; i < id.length; i++) h = ((h << 5) - h + id.charCodeAt(i)) | 0
    return Math.abs(h)
  }

  $: effectiveColor = object.color ?? hashFromId(object._id) % getPlatformColors($themeStore.dark).length
  $: swatchCss = getPlatformColor(effectiveColor, $themeStore.dark)
  $: selectedName = getPlatformColors($themeStore.dark)[effectiveColor]?.name

  function pickColor (ev: MouseEvent): void {
    showPopup(
      ColorsPopup,
      { colors: getPlatformColors($themeStore.dark), selected: selectedName, columns: 8 },
      ev.target as HTMLElement,
      async (index: number | undefined) => {
        if (typeof index !== 'number') return
        await client.update(object, { color: index })
      }
    )
  }
</script>

<div class="flex-row-center gap-1-5">
  <EditBox
    bind:value={rawLabel}
    placeholder={tracker.string.Component}
    disabled={rulesQuery?.disableEdit ?? false}
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
  <button type="button" class="color-swatch" style:background={swatchCss} on:click={pickColor} aria-label="Color" />
</div>

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

<style lang="scss">
  .color-swatch {
    width: 1.5rem;
    height: 1.5rem;
    border-radius: 0.25rem;
    border: 1px solid var(--theme-button-border);
    cursor: pointer;
  }
</style>
