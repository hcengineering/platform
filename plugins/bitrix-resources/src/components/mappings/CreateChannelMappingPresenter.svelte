<script lang="ts">
  import { BitrixEntityMapping, BitrixFieldMapping, CreateChannelOperation } from '@hcengineering/bitrix'

  import contact from '@hcengineering/contact'
  import { Component } from '@hcengineering/ui'
  import view from '@hcengineering/view'

  export let mapping: BitrixEntityMapping
  export let value: BitrixFieldMapping

  $: op = value.operation as CreateChannelOperation
</script>

<div class="flex flex-wrap">
  {#each op.fields as p, i}
    <div class="pattern flex-row-center gap-2">
      <Component
        is={view.component.ObjectPresenter}
        props={{ _class: contact.class.ChannelProvider, objectId: p.provider }}
      />
      ->
      {#if mapping.bitrixFields}
        {p.field ? mapping.bitrixFields[p.field]?.formLabel ?? mapping.bitrixFields[p.field]?.title : p.field ?? ''}
        {#if p.include !== undefined && p.include !== ''}
          /{p.include}/gi
        {/if}
        {#if p.exclude !== undefined && p.exclude !== ''}
          ^/{p.exclude}/gi
        {/if}
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
