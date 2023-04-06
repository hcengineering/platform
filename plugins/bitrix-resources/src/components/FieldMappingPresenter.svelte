<script lang="ts">
  import { BitrixEntityMapping, BitrixFieldMapping, MappingOperation } from '@hcengineering/bitrix'
  import { AnyAttribute } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import { Button, Icon, IconArrowLeft, IconClose, Label } from '@hcengineering/ui'
  import CopyMappingPresenter from './mappings/CopyMappingPresenter.svelte'
  import CreateAttachedDocPresenter from './mappings/CreateHRApplicationPresenter.svelte'
  import CreateChannelMappingPresenter from './mappings/CreateChannelMappingPresenter.svelte'
  import CreateTagMappingPresenter from './mappings/CreateTagMappingPresenter.svelte'
  import DownloadAttachmentPresenter from './mappings/DownloadAttachmentPresenter.svelte'
  import FindReferencePresenter from './mappings/FindReferencePresenter.svelte'

  export let mapping: BitrixEntityMapping
  export let value: BitrixFieldMapping
  $: kind = value.operation.kind

  let attr: AnyAttribute | undefined
  try {
    attr = getClient().getHierarchy().getAttribute(value.ofClass, value.attributeName)
  } catch (err: any) {
    console.error(err)
  }
</script>

<div class="flex-row-center top-divider">
  {#if attr}
    <div class="ml-4 fs-title mr-2 flex-row-center">
      <Label label={attr.label} />
      <Icon icon={IconArrowLeft} size={'small'} />
    </div>
  {/if}

  {#if mapping && mapping.bitrixFields}
    {#if kind === MappingOperation.CopyValue}
      <CopyMappingPresenter {mapping} {value} />
    {:else if kind === MappingOperation.CreateTag}
      <CreateTagMappingPresenter {mapping} {value} />
    {:else if kind === MappingOperation.CreateChannel}
      <CreateChannelMappingPresenter {mapping} {value} />
    {:else if kind === MappingOperation.DownloadAttachment}
      <DownloadAttachmentPresenter {mapping} {value} />
    {:else if kind === MappingOperation.FindReference}
      <FindReferencePresenter {mapping} {value} />
    {:else if kind === MappingOperation.CreateHRApplication}
      <CreateAttachedDocPresenter {mapping} {value} />
    {/if}

    <Button
      icon={IconClose}
      size={'small'}
      on:click={() => {
        getClient().remove(value)
      }}
    />
  {/if}
</div>
