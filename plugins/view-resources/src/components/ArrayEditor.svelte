<script lang="ts">
  import { Button, eventToHTMLElement, Icon, Label, showPopup } from '@hcengineering/ui'
  import { Ref, Doc, ArrOf, RefTo } from '@hcengineering/core'
  import { IntlString } from '@hcengineering/platform'

  import ArrayEditorPopup from './ArrayEditorPopup.svelte'
  import { getClient } from '@hcengineering/presentation'

  export let object: Doc
  export let label: IntlString
  export let value: Ref<Doc>[] = []
  export let type: ArrOf<RefTo<Doc>>
  export let onChange: (refs: Ref<Doc>[]) => void

  $: _clazz = (type.of as RefTo<Doc>).to
  const client = getClient()
  const hierarchy = client.getHierarchy()
  function openPopup (event: MouseEvent) {
    showPopup(
      ArrayEditorPopup,
      {
        _class: (type.of as RefTo<Doc>).to,
        space: object.space,
        placeholder: label,
        selectedObjects: value
      },
      eventToHTMLElement(event),
      undefined,
      (result) => {
        value = result ?? []
        onChange(value)
      }
    )
  }
  $: icon = hierarchy.getClass(_clazz).icon
</script>

<Button kind={'link'} size={'medium'} justify={'left'} width={'100%'} on:click={openPopup}>
  <svelte:fragment slot="content">
    {#if icon !== undefined}
      <div class="btn-icon"><Icon {icon} size={'small'} /></div>
    {/if}
    {#if value?.length > 0}
      <div class="flex-row-center flex-nowrap pointer-events-none">
        <span class="label nowrap">
          {value.length + ' items'}
        </span>
      </div>
    {:else}
      <Label {label} />
    {/if}
  </svelte:fragment>
</Button>
