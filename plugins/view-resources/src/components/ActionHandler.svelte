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
  import core, { Doc, Hierarchy, Ref, TxRemoveDoc } from '@hcengineering/core'
  import { getResource } from '@hcengineering/platform'
  import { addTxListener, getClient, contextStore } from '@hcengineering/presentation'
  import { AnyComponent, Component } from '@hcengineering/ui'
  import { Action, ViewContextType } from '@hcengineering/view'
  import { fly } from 'svelte/transition'
  import { getContextActions, getSelection } from '../actions'
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
  let sequences: Action<Doc, Record<string, any>>[] = []
  let delayedAction: (() => Promise<void>) | undefined
  let timer: any | undefined

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

  $: ctx = $contextStore.getLastContext()
  $: mode = $contextStore.getLastContext()?.mode
  $: application = $contextStore.getLastContext()?.application

  const isMac = /Macintosh/i.test(navigator.userAgent)

  function keyPrefix (key: KeyboardEvent): string {
    return (
      (key.altKey ? 'Alt + ' : '') +
      (key.shiftKey ? 'Shift + ' : '') +
      (key.metaKey ? 'Meta + ' : '') +
      (key.ctrlKey ? (isMac ? 'Ctrl + ' : 'Meta + ') : '')
    )
  }
  function m (s1: string, s2: string): boolean {
    return s1 === s2
  }

  function findKeySequence (pattern: string, key: KeyboardEvent): boolean {
    const lc = pattern.toLowerCase()
    const pfp = (keyPrefix(key) + key.key).toLowerCase()
    const pfp2 = (keyPrefix(key) + key.code).toLowerCase()
    return lc.startsWith(`${pfp}->`) || lc.startsWith(`${pfp2}->`)
  }

  function getSequences (
    key: KeyboardEvent,
    currentActions: Action<Doc, Record<string, any>>[]
  ): Action<Doc, Record<string, any>>[] {
    const res = currentActions.filter((p) => p.keyBinding?.find((p) => findKeySequence(p, key)))
    return res
  }

  function matchKeySequence (key: KeyboardEvent, pattern: string, lastKey: KeyboardEvent): boolean {
    const fp = (keyPrefix(key) + key.key).toLowerCase()
    const fp2 = (keyPrefix(key) + key.code).toLowerCase()
    const lc = pattern.toLowerCase()
    const pfp = (keyPrefix(lastKey) + lastKey.key).toLowerCase()
    const pfp2 = (keyPrefix(lastKey) + lastKey.code).toLowerCase()

    return m(`${pfp}->${fp}`, lc) || m(`${pfp2}->${fp}`, lc) || m(`${pfp}->${fp2}`, lc) || m(`${pfp2}->${fp2}`, lc)
  }

  function matchKey (key: KeyboardEvent, pattern: string): boolean {
    const fp = (keyPrefix(key) + key.key).toLowerCase()
    const fp2 = (keyPrefix(key) + key.code).toLowerCase()
    const lc = pattern.toLowerCase()
    return m(fp, lc) || m(fp2, lc)
  }

  let currentElement: EventTarget | null = null
  let currentActions: Action[] | undefined = undefined

  function clearActions (doc: any) {
    currentActions = undefined
  }

  $: selectionDocs = getSelection($focusStore, $selectionStore)

  $: clearActions({
    mode: mode as ViewContextType,
    application,
    focus: $focusStore.focus,
    selectionStore: $selectionStore,
    docs: selectionDocs
  })

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

    if (currentElement !== evt.target) {
      currentElement = evt.target
      currentActions = undefined
    }

    if (currentActions === undefined) {
      currentActions = await getCurrentActions(
        { mode: mode as ViewContextType, application },
        $focusStore.focus,
        $selectionStore
      )
      if (targetTagName === 'input' || targetTagName === 'button' || targetTagName === 'textarea') {
        // Retrieve actual list of actions for input context
        currentActions = await getContextActions(client, selectionDocs, { ...ctx, mode: 'input' })
      }
    }

    // For none we ignore all actions.
    if (ctx?.mode === 'none') {
      return
    }
    clearTimeout(timer)

    currentActions = currentActions.filter((p) => p.keyBinding !== undefined && p.keyBinding.length > 0)
    if (lastKey !== undefined) {
      for (const a of sequences) {
        // TODO: Handle multiple keys here
        if (a.keyBinding?.find((it) => (lastKey ? matchKeySequence(evt, it, lastKey) : false)) !== undefined) {
          const action = await getResource(a.action)
          if (action !== undefined) {
            sequences = []
            lastKey = undefined
            delayedAction = undefined
            return await action(selectionDocs, evt, a.actionProps)
          }
        }
      }
    }

    sequences = getSequences(evt, currentActions)
    let found = false
    for (const a of currentActions) {
      // TODO: Handle multiple keys here
      if (a.keyBinding?.find((it) => matchKey(evt, it)) !== undefined) {
        const action = await getResource(a.action)
        if (action !== undefined) {
          if (sequences.length === 0) {
            lastKey = undefined
            sequences = []
            delayedAction = undefined
            return await action(selectionDocs, evt, a.actionProps)
          } else {
            delayedAction = async () => await action(selectionDocs, evt, a.actionProps)
            found = true
          }
        }
      }
    }
    if (!found && delayedAction) {
      delayedAction()
      delayedAction = undefined
    }

    lastKey = evt

    timer = setTimeout(() => {
      lastKey = undefined
      sequences = []
      if (delayedAction !== undefined) {
        delayedAction()
        delayedAction = undefined
      }
    }, 300)
  }

  let presenter: AnyComponent | undefined
  async function updatePreviewPresenter (doc?: Doc): Promise<void> {
    presenter = doc !== undefined ? await getObjectPreview(client, Hierarchy.mixinOrClass(doc)) : undefined
  }

  $: updatePreviewPresenter($previewDocument)
</script>

<svelte:window on:keydown={handleKeys} />

{#if $previewDocument !== undefined && presenter}
  <div class="antiPanel float" transition:fly|local>
    <Component is={presenter} props={{ object: $previewDocument }} />
  </div>
{/if}
