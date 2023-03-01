<script lang="ts">
  import { BitrixEntityMapping, BitrixFieldMapping, FindReferenceOperation } from '@hcengineering/bitrix'

  export let mapping: BitrixEntityMapping
  export let value: BitrixFieldMapping

  $: op = value.operation as FindReferenceOperation
</script>

<div class="flex flex-wrap">
  <div class="pattern flex-row-center gap-2">
    {#if mapping.bitrixFields}
      {op.field ? mapping.bitrixFields[op.field]?.formLabel ?? mapping.bitrixFields[op.field]?.title : op.field ?? ''}
      => {op.referenceType} === {op.referenceClass}
    {/if}
  </div>
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
