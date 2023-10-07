<script lang="ts">
  import { BitrixEntityMapping, BitrixFieldMapping, CopyValueOperation } from '@hcengineering/bitrix'

  export let mapping: BitrixEntityMapping
  export let value: BitrixFieldMapping

  $: op = value.operation as CopyValueOperation

  const fieldOf = (field?: string) =>
    field ? mapping.bitrixFields[field]?.formLabel ?? mapping.bitrixFields[field]?.title : field ?? ''
</script>

<div class="flex-row-center flex-wrap">
  {#each op.patterns as p, i}
    <div class="pattern flex-row-center">
      <span>
        {p.text}
      </span>
      {#if mapping.bitrixFields}
        => {fieldOf(p.field)}
      {/if}
      {#if p.alternatives}
        {#each p.alternatives as alt, i}
          |{fieldOf(alt)}
        {/each}
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
