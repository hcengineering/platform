<script lang="ts">
  import { Class, Doc, DocumentQuery, FindOptions, Ref, Space } from '@hcengineering/core'
  import { IntlString } from '@hcengineering/platform'
  import { AnyComponent, Scroller } from '@hcengineering/ui'
  import { BuildModelKey, Viewlet, ViewOptions } from '@hcengineering/view'
  import { onMount } from 'svelte'
  import { ActionContext } from '@hcengineering/presentation'
  import { ListSelectionProvider, SelectDirection, focusStore, selectionStore } from '../..'

  import List from './List.svelte'

  export let _class: Ref<Class<Doc>>
  export let space: Ref<Space> | undefined = undefined
  export let query: DocumentQuery<Doc> = {}
  export let options: FindOptions<Doc> | undefined = undefined
  export let viewlet: Viewlet
  export let config: (string | BuildModelKey)[]

  // Per _class configuration, if supported.
  export let configurations: Record<Ref<Class<Doc>>, Viewlet['config']> | undefined
  export let createItemDialog: AnyComponent | undefined
  export let createItemDialogProps: Record<string, any> | undefined = undefined
  export let createItemLabel: IntlString | undefined
  export let viewOptions: ViewOptions
  export let props: Record<string, any> = {}

  let list: List
  let scroll: Scroller
  let divScroll: HTMLDivElement
  let listWidth: number

  const listProvider = new ListSelectionProvider(
    (offset: 1 | -1 | 0, of?: Doc, dir?: SelectDirection, noScroll?: boolean) => {
      if (dir === 'vertical') {
        // Select next
        list?.select(offset, of, noScroll)
      }
    }
  )

  onMount(() => {
    ;(document.activeElement as HTMLElement)?.blur()
  })
</script>

<ActionContext
  context={{
    mode: 'browser'
  }}
/>
<div bind:clientWidth={listWidth} class="w-full h-full py-4 clear-mins">
  <Scroller
    bind:this={scroll}
    bind:divScroll
    fade={{ multipler: { top: 2.75 * viewOptions.groupBy.length, bottom: 0 } }}
    padding={'0 1rem'}
    noFade
    checkForHeaders
  >
    <List
      bind:this={list}
      {_class}
      {space}
      {query}
      {config}
      {configurations}
      {options}
      {createItemDialog}
      {createItemDialogProps}
      {createItemLabel}
      {viewOptions}
      {props}
      compactMode={listWidth <= 800}
      viewOptionsConfig={viewlet.viewOptions?.other}
      selectedObjectIds={$selectionStore ?? []}
      selection={listProvider.current($focusStore)}
      on:row-focus={(event) => {
        listProvider.updateFocus(event.detail ?? undefined)
      }}
      on:check={(event) => {
        listProvider.updateSelection(event.detail.docs, event.detail.value)
      }}
      on:content={(event) => {
        listProvider.update(event.detail)
      }}
      on:collapsed={(event) => {
        if (divScroll.getBoundingClientRect().top > event.detail.div.getBoundingClientRect().top) {
          event.detail.div.scrollIntoView(true)
        }
      }}
    />
  </Scroller>
</div>
