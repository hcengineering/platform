<script lang="ts">
  import { BitrixEntityMapping, BitrixFieldMapping, CreateHRApplication } from '@hcengineering/bitrix'
  import task from '@hcengineering/task'
  import { ObjectPresenter } from '@hcengineering/view-resources'

  export let mapping: BitrixEntityMapping
  export let value: BitrixFieldMapping

  $: op = value.operation as CreateHRApplication
</script>

<div class="flex flex-wrap">
  <div class="pattern flex-row-center gap-2">
    {mapping.bitrixFields[op.vacancyField]?.filterLabel} -> {mapping.bitrixFields[op.stateField]?.filterLabel}
    <span class="p-1">-></span>
    <ObjectPresenter objectId={op.defaultTemplate} _class={task.class.KanbanTemplate} />
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
