<script lang="ts">
  import { AnyAttribute, DocIndexState, extractDocKey, isFullTextAttribute } from '@hcengineering/core'

  import { Label } from '@hcengineering/ui'
  import { Icon } from '@hcengineering/ui'
  import { getClient } from '../utils'

  export let indexDoc: DocIndexState
  export let search: string = ''

  const client = getClient()

  function getContent (extra: string[], value: string): string[] {
    if (value == null || value === '') {
      return []
    }
    const result = extra.includes('base64') ? decodeURIComponent(escape(atob(value))) : value

    return `${result}`.split('\n')
  }

  $: summary = indexDoc?.fullSummary ?? undefined

  $: attributes =
    indexDoc !== undefined
      ? Object.entries(indexDoc.attributes).reduce<[AnyAttribute, string[][]][]>((a, b) => {
        const bb = extractDocKey(b[0])
        if (bb._class === undefined) {
          return a
        }
        const attr = client.getHierarchy().findAttribute(bb._class, bb.attr)
        if (attr === undefined || !isFullTextAttribute(attr)) {
          return a
        }
        const pos = a.findIndex((it) => it[0] === attr)
        if (pos !== -1) {
          a[pos][1].push(getContent(bb.extra, b[1]))
        } else {
          a.push([attr, [getContent(bb.extra, b[1])]])
        }
        return a
      }, [])
      : []
</script>

{#if summary}
  {#if search.length > 0}
    <span class="font-medium">Result:</span>
    {#each summary.split('\n').filter((line, idx, arr) => {
      return line.toLowerCase().includes(search.toLowerCase()) || arr[idx - 1]
          ?.toLowerCase()
          .includes(search.toLowerCase())
    }) as line}
      <span class:highlight={line.toLowerCase().includes(search.toLowerCase())}>{line}</span>
    {/each}
    <br />
  {/if}
  <span class="font-medium">Summary:</span>
  {#each summary.split('\n') as line}
    {@const hl = search.length > 0 && line.toLowerCase().includes(search.toLowerCase())}
    <span class:text-md={!hl} class:highlight={hl}>{line}</span>
  {/each}
{:else if indexDoc}
  {#each attributes as attr}
    {@const clOf = client.getHierarchy().getClass(attr[0].attributeOf)}
    <div class="flex-row-center">
      {#if clOf.icon}
        <div class="mr-1">
          <Icon size={'medium'} icon={clOf.icon} />
        </div>
      {/if}
      <Label label={clOf.label} />.<Label label={attr[0].label} />
    </div>
    <div class="p-1 flex-row flex-wrap">
      {#each attr[1] as doc}
        <div class="p-1" class:flex-col={doc.length > 1}>
          {#if search.length > 0}
            <span class="font-medium">Result:</span>
            {#each doc.filter((line) => line.toLowerCase().includes(search.toLowerCase())) as line}
              <span class:highlight={true}>{line}</span>
            {/each}
            <br />
          {/if}
          {#each doc as line}
            {@const hl = search.length > 0 && line.toLowerCase().includes(search.toLowerCase())}
            <span class:text-md={!hl} class:highlight={hl}>{line}</span>
          {/each}
        </div>
      {/each}
    </div>
  {/each}
{/if}

<style lang="scss">
  .highlight {
    color: var(--theme-link-color);
  }
</style>
