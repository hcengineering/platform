<script lang="ts">
  import { BitrixEntityMapping, BitrixFieldMapping, Fields, MappingOperation } from '@hcengineering/bitrix'
  import { AnyAttribute } from '@hcengineering/core'
  import presentation, { Card } from '@hcengineering/presentation'
  import { Label } from '@hcengineering/ui'
  import bitrix from '../plugin'
  import CopyMapping from './mappings/CopyMapping.svelte'
  import CreateChannelMapping from './mappings/CreateChannelMapping.svelte'
  import CreateTagMapping from './mappings/CreateTagMapping.svelte'
  import DownloadAttachmentMapping from './mappings/DownloadAttachmentMapping.svelte'

  export let mapping: BitrixEntityMapping
  export let fields: Fields = {}
  export let attribute: AnyAttribute
  export let kind: MappingOperation | undefined
  export let field: BitrixFieldMapping | undefined

  $: _kind = kind ?? field?.operation.kind

  let op: CopyMapping | CreateTagMapping | CreateChannelMapping | DownloadAttachmentMapping

  async function save (): Promise<void> {
    op.save()
  }
</script>

<Card
  label={bitrix.string.AddField}
  canSave={attribute !== undefined}
  okAction={save}
  okLabel={presentation.string.Save}
  on:close
>
  <svelte:fragment slot="header">
    <Label label={attribute.label} />
  </svelte:fragment>
  {#if _kind === MappingOperation.CopyValue}
    <CopyMapping {mapping} {fields} {attribute} {field} bind:this={op} />
  {:else if _kind === MappingOperation.CreateTag}
    <CreateTagMapping {mapping} {fields} {attribute} {field} bind:this={op} />
  {:else if _kind === MappingOperation.CreateChannel}
    <CreateChannelMapping {mapping} {fields} {attribute} {field} bind:this={op} />
  {:else if _kind === MappingOperation.DownloadAttachment}
    <DownloadAttachmentMapping {mapping} {fields} {attribute} {field} bind:this={op} />
  {/if}
</Card>
