<!--
//
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
//
-->
<script lang="ts">
  import { AttachedData, generateId, Ref } from '@hcengineering/core'
  import { Document, DocumentVersion, RichDocumentContent } from '@hcengineering/document'
  import { Card, getClient } from '@hcengineering/presentation'
  import { createFocusManager, FocusHandler, Icon, Label } from '@hcengineering/ui'
  import Scroller from '@hcengineering/ui/src/components/Scroller.svelte'
  import { Editor } from '@tiptap/core'
  import Highlight from '@tiptap/extension-highlight'
  import Link from '@tiptap/extension-link'
  import Placeholder from '@tiptap/extension-placeholder'
  import TaskItem from '@tiptap/extension-task-item'
  import TaskList from '@tiptap/extension-task-list'
  import StarterKit from '@tiptap/starter-kit'
  import { Transaction } from 'prosemirror-state'
  import { Step } from 'prosemirror-transform'
  import { createEventDispatcher, onDestroy, onMount } from 'svelte'
  import document from '../plugin'
  import { UniqId } from '../uniqId'

  // export let objectId: Ref<Doc>
  // export let space: Ref<Space>
  // export let _class: Ref<Class<Doc>>

  export let object: Document
  // export let content: string

  export function canClose (): boolean {
    return true
  }

  const id: Ref<DocumentVersion> = generateId()

  const versionObject: AttachedData<DocumentVersion> = {
    version: 0,
    sequenceNumber: object.editSequence,
    content: '',
    approved: null
  }

  const dispatch = createEventDispatcher()
  const client = getClient()

  async function createDocumentVersion () {
    versionObject.content = editor.getHTML()

    const incResult = await client.update(
      object,
      {
        $inc: { versionCounter: 1 }
      },
      true
    )
    versionObject.version = ((incResult as any).object as Document).versionCounter

    await client.addCollection(
      document.class.DocumentVersion,
      document.space.Documents,
      object._id,
      object._class,
      'versions',
      versionObject,
      id
    )
    dispatch('close', id)
  }

  let lastVersion: DocumentVersion | undefined
  let richContent: RichDocumentContent[] = []

  function recreateDocument (version?: DocumentVersion): void {
    const maxVersion = richContent.reduce((a, b) => Math.max(a, b.version), 0)

    const toApply = richContent.findIndex((it) => it.version === (version?.sequenceNumber ?? maxVersion))
    // Filter steps if some next ones contain them in ignored.

    const asteps: Step[] = []
    // const newSteps: Step[] = []
    for (const a of richContent.slice(0, toApply)) {
      asteps.push(...a.steps.map((it) => Step.fromJSON(editor.schema, it)))
    }
    for (const a of richContent.slice(toApply)) {
      asteps.push(...a.steps.map((it) => Step.fromJSON(editor.schema, it)))
    }
    const tr = editor.state.tr

    for (let i = 0; i < asteps.length; i++) {
      try {
        tr.step(asteps[i])
      } catch (err: any) {
        // debugger
        console.trace(err)
      }
    }
    if (tr.docChanged) {
      tr.setMeta('addToHistory', false)
      const newState = editor.state.apply(tr)
      editor.view.updateState(newState)
    }
  }

  async function update (): Promise<void> {
    lastVersion = await client.findOne(document.class.DocumentVersion, {}, { sort: { version: -1 } })
    richContent = await client.findAll(document.class.RichDocumentContent, { attachedTo: object._id })
    recreateDocument(lastVersion)
  }

  update()

  let editor: Editor

  onMount(() => {
    editor = new Editor({
      element,
      content: '',
      editable: false,
      extensions: [
        StarterKit,
        Highlight,
        Link.configure({ openOnClick: false }),
        // ...(supportSubmit ? [Handle] : []), // order important
        // Typography, // we need to disable 1/2 -> ½ rule (https://github.com/hcengineering/anticrm/issues/345)
        Placeholder.configure({ placeholder: '' }),
        TaskList,
        TaskItem.configure({
          nested: true,
          HTMLAttributes: {
            class: 'flex flex-grow gap-1 checkbox_style'
          }
        }),
        UniqId
        // ...extensions
      ],
      onTransaction: () => {
        // force re-render so `editor.isActive` works as expected
        editor = editor
      },
      onBlur: ({ event }) => {},
      onFocus: () => {},
      onUpdate: (op: { editor: Editor; transaction: Transaction }) => {},
      onSelectionUpdate: () => {}
    })
  })

  onDestroy(() => {
    if (editor) {
      editor.destroy()
    }
  })

  const manager = createFocusManager()
  let element: HTMLElement
</script>

<FocusHandler {manager} />

<Card
  label={document.string.CreateDocumentVersion}
  okAction={createDocumentVersion}
  canSave={true}
  on:close={() => {
    dispatch('close')
  }}
>
  <div class="flex-row clear-mins">
    <div class="mr-3 flex-col">
      <div class="flex-row-center">
        <div class="p-1">
          <Icon icon={document.icon.Document} size={'medium'} />
        </div>
        {#if lastVersion === undefined}
          <Label label={document.string.NoVersions} />
        {/if}
      </div>
      <div class="flex-row-center">
        <Label label={document.string.Revision} />
        {object.editSequence}
      </div>
    </div>

    <div class="mt-4 flex-row flex-grow">
      <div class="h-75p background-bg-focused border-radius-1 p-2">
        <Scroller>
          <div class="select-text" style="width: 100%;" bind:this={element} />
        </Scroller>
      </div>
    </div>
  </div>
</Card>
