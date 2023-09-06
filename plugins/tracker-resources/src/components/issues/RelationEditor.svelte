<script lang="ts">
  import { Class, Doc, Ref } from '@hcengineering/core'
  import { Issue } from '@hcengineering/tracker'
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

<div class="flex-column flex-grow clear-mins">
  {#each classes as classCategory}
    {@const vals = valueGroup.get(classCategory)}
    {#if vals}
      <RelationEditorPart {value} _class={classCategory} documentIds={vals} {type} />
    {/if}
  {/each}
</div>
