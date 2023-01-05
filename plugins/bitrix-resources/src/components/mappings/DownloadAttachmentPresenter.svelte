<script lang="ts">
  import { BitrixEntityMapping, BitrixFieldMapping, DownloadAttachmentOperation } from '@hcengineering/bitrix'

  export let mapping: BitrixEntityMapping
  export let value: BitrixFieldMapping

  $: op = value.operation as DownloadAttachmentOperation
</script>

<div class="flex flex-wrap">
  {#each op.fields as p, i}
    <div class="pattern flex-row-center gap-2">
      {#if mapping.bitrixFields}
        {p.field ? mapping.bitrixFields[p.field]?.formLabel ?? mapping.bitrixFields[p.field]?.title : p.field ?? ''}
      {/if}
    </div>
  {/each}
</div>

<style lang="scss">
  .pattern {
    margin: 0.1rem;
    padding: 0.3rem;
    flex-shrink: 0;
    border: 1px dashed var(--accent-color);
    border-radius: 0.25rem;

    font-weight: 500;
    font-size: 0.75rem;

    // text-transform: uppercase;
    color: var(--accent-color);
    &:hover {
      color: var(--caption-color);
    }
  }
</style>
