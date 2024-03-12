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
  import { Analytics } from '@hcengineering/analytics'
  import core, { Doc, Hierarchy, Ref, Space, TxRemoveDoc } from '@hcengineering/core'
  import { getResource } from '@hcengineering/platform'
  import { addTxListener, contextStore, getClient } from '@hcengineering/presentation'
  import { AnyComponent, Component } from '@hcengineering/ui'
  import { Action, ViewContextType } from '@hcengineering/view'
  import { fly } from 'svelte/transition'
  import { getContextActions, getSelection } from '../actions'
  import { ListSelectionProvider, SelectionStore, focusStore, previewDocument, selectionStore } from '../selection'
  import { getObjectPreview, restrictionStore } from '../utils'

  export let currentSpace: Ref<Space> | undefined

  const client = getClient()

  addTxListener((tx) => {
    if (tx._class === core.class.TxRemoveDoc) {
      const docId = (tx as TxRemoveDoc<Doc>).objectId
      const provider = ListSelectionProvider.Find(docId)
      if (provider !== undefined) {
        provider.selection.update((old) => {
          return old.filter((it) => it._id !== docId)
        })
      }
    }
  })

  let lastKey: KeyboardEvent | undefined
  let sequences: Array<Action<Doc, Record<string, any>>> = []
  let delayedAction: (() => Promise<void>) | undefined
  let timer: any | undefined

  async function getCurrentActions (
    context: {
      mode: ViewContextType
      application?: Ref<Doc>
    },
    focus: Doc | undefined | null,
    selection: SelectionStore
  ): Promise<Action[]> {
    let docs: Doc | Doc[] = []
    if (selection.docs.find((it) => it._id === focus?._id) === undefined && focus != null) {
      docs = focus
    } else {
      docs = selection.docs
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
    currentActions: Array<Action<Doc, Record<string, any>>>
  ): Array<Action<Doc, Record<string, any>>> {
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

  $: disableActions = $restrictionStore.disableActions

  async function handleKeys (evt: KeyboardEvent): Promise<void> {
    // For none we ignore all actions.
    if (disableActions || ctx?.mode === 'none') return
    const targetTagName = (evt.target as any)?.tagName?.toLowerCase()

    let elm = evt.target as HTMLElement
    let isContentEditable = false

    while (true) {
      if (elm.isContentEditable) {
        isContentEditable = true
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

    clearTimeout(timer)

    async function activateAction (a: Action): Promise<boolean> {
      const action = await getResource(a.action)
      if (action === undefined) return false

      lastKey = undefined
      delayedAction = undefined
      Analytics.handleEvent(a._id)
      const actionProps = { ...a.actionProps }
      if (!Object.prototype.hasOwnProperty.call(actionProps, 'props')) actionProps.props = {}
      actionProps.props.space = currentSpace
      await action(selectionDocs, evt, actionProps)
      return true
    }

    // 3 cases for keyBinding
    //  matches the sequence - immediately action
    //  start sequence - postpone other action
    //  matches the key - execute if there is no start sequence actions

    let postpone = false
    let nonSequenceAction: Action | undefined

    for (const a of currentActions) {
      if (a.keyBinding === undefined || a.keyBinding.length < 1) continue
      if (isContentEditable && a.allowedForEditableContent !== true) continue
      const t = lastKey
      if (t !== undefined && a.keyBinding.some((it) => matchKeySequence(evt, it, t)) && (await activateAction(a))) {
        return
      }
      if (!postpone && a.keyBinding.some((p) => findKeySequence(p, evt))) {
        postpone = true
        continue
      }
      if (nonSequenceAction === undefined && a.keyBinding.some((it) => matchKey(evt, it))) {
        nonSequenceAction = a
      }
    }

    if (delayedAction !== undefined) {
      await delayedAction()
      delayedAction = undefined
    }

    const t = nonSequenceAction
    if (t !== undefined) {
      if (!postpone) {
        await activateAction(t)
        return
      }

      delayedAction = async () => {
        await activateAction(t)
      }
    }

    lastKey = evt

    timer = setTimeout(() => {
      lastKey = undefined
      sequences = []
      if (delayedAction !== undefined) {
        void delayedAction()
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
