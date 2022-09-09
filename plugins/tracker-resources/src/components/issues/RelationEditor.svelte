<script lang="ts">
  import { Class, Doc, Ref } from '@anticrm/core'
  import { Issue } from '@anticrm/tracker'
  import RelationEditorPart from './RelationEditorPart.svelte'

  export let value: Issue
  export let type: 'isBlocking' | 'blockedBy' | 'relations'
  export let blockedBy: Doc[] | undefined = undefined

  $: valueGroup = (type === 'isBlocking' ? blockedBy ?? [] : value[type] ?? []).reduce<
    Map<Ref<Class<Doc>>, Ref<Doc>[]>
  >((rv, x) => {
    if (rv.has(x._class)) {
      rv.get(x._class)?.push(x._id)
    } else {
      rv.set(x._class, [x._id])
    }
    return rv
  }, new Map())

  $: classes = Array.from(valueGroup.keys())
</script>

<div class="flex-column flex-grow">
  {#each classes as classCategory}
    {@const vals = valueGroup.get(classCategory)}
    {#if vals}
      <RelationEditorPart {value} _class={classCategory} documentIds={vals} {type} />
    {/if}
  {/each}
</div>

<style lang="scss">
  .tag-container {
    overflow: hidden;
    display: flex;
    align-items: center;
    flex-shrink: 0;
    padding-left: 0.5rem;
    height: 1.5rem;
    min-width: 0;
    min-height: 0;
    border-radius: 0.5rem;
    width: fit-content;
    &:hover {
      border: 1px solid var(--divider-color);
    }

    .btn-close {
      flex-shrink: 0;
      margin-left: 0.125rem;
      padding: 0 0.25rem 0 0.125rem;
      height: 1.75rem;
      color: var(--content-color);
      border-left: 1px solid transparent;

      &:hover {
        color: var(--caption-color);
        border-left-color: var(--divider-color);
      }
    }
  }
</style>
