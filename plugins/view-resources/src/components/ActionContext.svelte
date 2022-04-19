<script lang="ts">
  import { generateId } from '@anticrm/core'
  import { ViewContext } from '@anticrm/view'
  import { onDestroy } from 'svelte'
  import { contextStore } from '../context'
import { previewDocument } from '../selection';

  export let context: ViewContext

  const id = generateId()

  $: len = $contextStore.findIndex(it => (it as any).id === id)

  onDestroy(() => {
    contextStore.update((t) => {
      return t.slice(0, len ?? 0)
    })
  })

  $: {
    contextStore.update((cur) => {
      const pos = cur.findIndex(it => (it as any).id === id)
      const newCur = {
        id,
        mode: context.mode,
        application: context.application ?? cur[(pos !== -1 ? pos : cur.length) - 1]?.application
      }
      previewDocument.set(undefined)
      if (pos === -1) {
        len = cur.length
        return [...cur, newCur]
      }
      len = pos
      return [...cur.slice(0, pos), newCur]
    })
  }
</script>
