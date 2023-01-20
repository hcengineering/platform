<script lang="ts">
  import core, { AnyAttribute, Doc, DocIndexState, extractDocKey, isFullTextAttribute, Ref } from '@hcengineering/core'

  import { EditBox, Label, Panel } from '@hcengineering/ui'
  import Icon from '@hcengineering/ui/src/components/Icon.svelte'
  import { createQuery, getClient } from '../utils'

  export let objectId: Ref<Doc>

  const client = getClient()
  const indexDocQuery = createQuery()
  let indexDoc: DocIndexState | undefined
  $: if (objectId !== undefined) {
    indexDocQuery.query(core.class.DocIndexState, { _id: objectId as Ref<DocIndexState> }, (res) => {
      console.log(res)
      indexDoc = res.shift()
    })
  } else {
    indexDocQuery.unsubscribe()
  }

  function getContent (extra: string[], value: string): string[] {
    const result = extra.includes('base64') ? decodeURIComponent(escape(atob(value))) : value

    return `${result}`.split('\n')
  }
  let search = ''

  $: summary = (indexDoc?.attributes as any).summary

  $: attributes =
    indexDoc !== undefined
      ? Object.entries(indexDoc.attributes).reduce<[AnyAttribute, string[][]][]>((a, b) => {
        const bb = extractDocKey(b[0])
        if (bb._class === undefined) {
          return a
        }
        const attr = client.getHierarchy().getAttribute(bb._class, bb.attr)
        if (!isFullTextAttribute(attr)) {
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

<Panel on:changeContent on:close>
  <EditBox bind:value={search} kind="search-style" />
  <div class="indexed-background">
    <div class="indexed-doc text-base max-h-125">
      {#if summary}
        Summary:
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
                {#each doc as line}
                  {@const hl = search.length > 0 && line.toLowerCase().includes(search.toLowerCase())}
                  <span class:text-md={!hl} class:highlight={hl}>{line}</span>
                {/each}
              </div>
            {/each}
          </div>
        {/each}
      {/if}
    </div>
  </div>
</Panel>

<style lang="scss">
  .indexed-doc {
    padding: 2.5rem;
    display: grid;
    overflow: auto;
    min-width: 50rem;
    max-width: 200rem;
  }
  .indexed-background {
    background-color: white;
    color: black;
    user-select: text;
    .highlight {
      color: red;
    }
  }
</style>
