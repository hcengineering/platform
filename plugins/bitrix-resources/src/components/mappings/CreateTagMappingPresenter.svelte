<script lang="ts">
  import { BitrixEntityMapping, BitrixFieldMapping, CreateTagOperation } from '@hcengineering/bitrix'
  import { getEmbeddedLabel } from '@hcengineering/platform'
  import tags from '@hcengineering/tags'
  import { Button } from '@hcengineering/ui'

  export let mapping: BitrixEntityMapping
  export let value: BitrixFieldMapping

  $: op = value.operation as CreateTagOperation

  const tagLevel = [tags.icon.Level1, tags.icon.Level2, tags.icon.Level3]
  const labels = [getEmbeddedLabel('Initial'), getEmbeddedLabel('Meaningfull'), getEmbeddedLabel('Expert')]
</script>

<div class="flex flex-wrap">
  {#each op.fields as p, i}
    {@const tagIcon = tagLevel[p.weight % 3]}
    {@const tagLabel = labels[Math.floor(p.weight / 3)]}

    <div class="pattern flex-row-center gap-2">
      {#if mapping.bitrixFields}
        {p.field ? mapping.bitrixFields[p.field]?.formLabel ?? mapping.bitrixFields[p.field]?.title : p.field ?? ''}
      {/if}

      <Button label={tagLabel} icon={tagIcon} size={'small'} disabled={true} />
      {p.split}
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
