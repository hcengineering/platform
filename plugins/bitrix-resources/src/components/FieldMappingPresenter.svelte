<script lang="ts">
  import { BitrixEntityMapping, BitrixFieldMapping, MappingOperation } from '@hcengineering/bitrix'
  import { AnyAttribute } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import { Icon, IconArrowLeft, Label } from '@hcengineering/ui'
  import CopyMappingPresenter from './mappings/CopyMappingPresenter.svelte'
  import CreateChannelMappingPresenter from './mappings/CreateChannelMappingPresenter.svelte'
  import CreateTagMappingPresenter from './mappings/CreateTagMappingPresenter.svelte'

  export let mapping: BitrixEntityMapping
  export let value: BitrixFieldMapping
  $: kind = value.operation.kind

  const attr: AnyAttribute | undefined = getClient().getHierarchy().getAttribute(value.ofClass, value.attributeName)
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
    {/if}
  {/if}
</div>
