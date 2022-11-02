<!--
// Copyright © 2022 Hardcore Engineering Inc.
// 
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
// 
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// 
// See the License for the specific language governing permissions and
// limitations under the License.
-->
<script lang="ts">
  import core, { Doc, Ref, TxRemoveDoc } from '@hcengineering/core'
  import { getResource } from '@hcengineering/platform'
  import { addTxListener, getClient } from '@hcengineering/presentation'
  import { AnyComponent, Component } from '@hcengineering/ui'
  import { Action, ViewContextType } from '@hcengineering/view'
  import { fly } from 'svelte/transition'
  import { getContextActions, getSelection } from '../actions'
  import { contextStore } from '../context'
  import { focusStore, previewDocument, selectionStore } from '../selection'
  import { getObjectPreview } from '../utils'

  const client = getClient()

  addTxListener((tx) => {
    if (tx._class === core.class.TxRemoveDoc) {
      const docId = (tx as TxRemoveDoc<Doc>).objectId
      if ($selectionStore.find((it) => it._id === docId) !== undefined) {
        selectionStore.update((old) => {
          return old.filter((it) => it._id !== docId)
        })
      }
    }
  })

  let lastKey: KeyboardEvent | undefined

  async function getCurrentActions (
    context: {
      mode: ViewContextType
      application?: Ref<Doc>
    },
    focus: Doc | undefined | null,
    selection: Doc[]
  ): Promise<Action[]> {
    let docs: Doc | Doc[] = []
    if (selection.find((it) => it._id === focus?._id) === undefined && focus != null) {
      docs = focus
    } else {
      docs = selection
    }

    return await getContextActions(client, docs, context)
  }

  $: ctx = $contextStore[$contextStore.length - 1]
  $: mode = $contextStore[$contextStore.length - 1]?.mode
  $: application = $contextStore[$contextStore.length - 1]?.application

  function keyPrefix (key: KeyboardEvent): string {
    return (
      (key.altKey ? 'Alt + ' : '') +
      (key.shiftKey ? 'Shift + ' : '') +
      (key.metaKey ? 'Meta + ' : '') +
      (key.ctrlKey ? 'Ctrl + ' : '')
    )
  }
  function m (s1: string, s2: string): boolean {
    return s1 === s2.toLowerCase()
  }
  function matchKey (key: KeyboardEvent, pattern: string, lastKey?: KeyboardEvent): boolean {
    const fp = (keyPrefix(key) + key.key).toLowerCase()
    const fp2 = (keyPrefix(key) + key.code).toLowerCase()
    const lc = pattern.toLowerCase()
    if (m(fp, lc) || m(fp2, lc)) {
      return true
    }
    if (lastKey !== undefined) {
      // Check with last key
      const pfp = (keyPrefix(key) + lastKey.key).toLowerCase()
      const pfp2 = (keyPrefix(key) + lastKey.code).toLowerCase()

      return m(`${pfp}->${fp}`, lc) || m(`${pfp2}->${fp}`, lc) || m(`${pfp}->${fp2}`, lc) || m(`${pfp2}->${fp2}`, lc)
    }
    return false
  }

  async function handleKeys (evt: KeyboardEvent): Promise<void> {
    const targetTagName = (evt.target as any)?.tagName?.toLowerCase()

    let elm = evt.target as HTMLElement
    while (true) {
      if (elm.contentEditable === 'true') {
        return
      }
      const prt = elm.parentElement
      if (prt === null) {
        break
      }
      elm = prt
    }

    let currentActions = await getCurrentActions(
      { mode: mode as ViewContextType, application },
      $focusStore.focus,
      $selectionStore
    )

    // For none we ignore all actions.
    if (ctx.mode === 'none') {
      return
    }

    const docs = getSelection($focusStore, $selectionStore)

    if (targetTagName === 'input' || targetTagName === 'button' || targetTagName === 'textarea') {
      // Retrieve actual list of actions for input context
      currentActions = await getContextActions(client, docs, { ...ctx, mode: 'input' })
    }
    for (const a of currentActions) {
      // TODO: Handle multiple keys here
      if (a.keyBinding?.find((it) => matchKey(evt, it, lastKey)) !== undefined) {
        lastKey = undefined
        const action = await getResource(a.action)
        if (action !== undefined) {
          await action($focusStore.focus, evt, a.actionProps)
        }
      }
    }

    lastKey = evt

    setTimeout(() => {
      lastKey = undefined
    }, 500)
  }

  let presenter: AnyComponent | undefined
  async function updatePreviewPresenter (doc?: Doc): Promise<void> {
    presenter = doc !== undefined ? await getObjectPreview(client, doc._class) : undefined
  }

  $: updatePreviewPresenter($previewDocument)
</script>

<svelte:window on:keydown={handleKeys} />

{#if $previewDocument !== undefined && presenter}
  <div transition:fly|local style:position="fixed" style:right={'0'} style:top={'10rem'} style:z-index={'500'}>
    <div class="antiPanel p-6">
      <Component is={presenter} props={{ object: $previewDocument }} />
    </div>
  </div>
{/if}
