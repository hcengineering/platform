<script lang="ts">
  import core, { Class, Doc, Ref, TxRemoveDoc } from '@anticrm/core'
  import { getResource } from '@anticrm/platform'
  import { addTxListener, getClient } from '@anticrm/presentation'
  import { AnyComponent, Component } from '@anticrm/ui'
  import { Action, ViewContext } from '@anticrm/view'
  import { fly } from 'svelte/transition'
  import { getContextActions } from '../actions'
  import { contextStore } from '../context'
  import { focusStore, previewDocument, selectionStore } from '../selection'
  import { getObjectPreview } from '../utils'

  const client = getClient()

  let actions: Action[] = []
  let q = 0

  $: selectionClass = $focusStore.focus?._class

  addTxListener((tx) => {
    if (tx._class === core.class.TxRemoveDoc) {
      const docId = (tx as TxRemoveDoc<Doc>).objectId
      if ($selectionStore.find(it => it._id === docId) !== undefined) {
        selectionStore.update((old) => {
          return old.filter(it => it._id !== docId)
        })
      }
    }
  })

  let lastKey: KeyboardEvent | undefined

  async function updateActions (context: ViewContext, selectionClass: Ref<Class<Doc>> | undefined, multiSelection: boolean): Promise<void> {
    const t = ++q
    const r = await getContextActions(client, selectionClass ?? core.class.Doc, context, multiSelection)
    if (t === q) {
      actions = r
    }
  }
  $: ctx = $contextStore[$contextStore.length - 1]
  $: if (ctx !== undefined) updateActions(ctx, selectionClass, $selectionStore.length > 1)

  function matchKey (key: KeyboardEvent, pattern: string): boolean {
    const fp = ((key.altKey ? 'Alt + ' : '') + (key.shiftKey ? 'Shift + ' : '') + (key.metaKey ? 'Meta + ' : '') + key.key).toLowerCase()
    const fp2 = ((key.altKey ? 'Alt + ' : '') + (key.shiftKey ? 'Shift + ' : '') + (key.metaKey ? 'Meta + ' : '') + key.code).toLowerCase()
    return fp === pattern.toLowerCase() || fp2 === pattern.toLowerCase()
  }

  async function handleKeys (evt: KeyboardEvent): Promise<void> {
    const targetTagName = (evt.target as any)?.tagName?.toLowerCase()
    if (targetTagName === 'input' || targetTagName === 'button' || targetTagName === 'textarea') {
      return
    }
    lastKey = evt
    for (const a of actions) {
      // TODO: Handle multiple keys here
      if (a.keyBinding?.find(it => matchKey(evt, it)) !== undefined) {
        const action = await getResource(a.action)
        if (action !== undefined) {
          action($focusStore.focus, evt)
        }
      }
    }
  }

  let presenter: AnyComponent | undefined
  async function updatePreviewPresenter (doc?: Doc): Promise<void> {
    presenter = doc !== undefined ? await getObjectPreview(client, doc._class) : undefined
  }
  
  $: updatePreviewPresenter($previewDocument)
</script>

<svelte:window on:keydown={handleKeys} />

{#if $previewDocument !== undefined && presenter }
  <div transition:fly|local style:position="fixed" style:right={'0'} style:top={'10rem'} style:z-index={'50000'}>
    <div class='antiPanel p-10'>
      <Component is={presenter} props={{ object: $previewDocument }} />
    </div>
  </div>
{/if}
