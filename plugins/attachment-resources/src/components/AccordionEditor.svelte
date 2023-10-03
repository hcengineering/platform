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
  import { createEventDispatcher } from 'svelte'
  import { Doc, Ref, Space, Class } from '@hcengineering/core'
  import { Button, Label, IconDownOutline, tooltip } from '@hcengineering/ui'
  import textEditorPlugin, { IsEmptyContentExtension, TextEditor } from '@hcengineering/text-editor'
  import type { AccordionItem } from '..'
  import AttachmentStyledBox from './AttachmentStyledBox.svelte'

  export let items: AccordionItem[]
  export let objectId: Ref<Doc> | undefined = undefined
  export let space: Ref<Space> | undefined = undefined
  export let _class: Ref<Class<Doc>> | undefined = undefined
  export let withoutAttach: boolean = false

  export function createAttachments (): void {
    attachments[attachments.length - 1].createAttachments()
  }

  const dispatch = createEventDispatcher()

  const attachments: AttachmentStyledBox[] = []
  const edits: TextEditor[] = []
  let hasAttachments: boolean = false
  const isEmpty: boolean[] = [true]
  const expanded: boolean[] = []
  items.forEach(() => expanded.push(false))

  const flip = (index: number, ev?: MouseEvent): void => {
    ev?.stopPropagation()
    const cont = items[index].content
    switch (items[index].state) {
      case 'opened':
        attachments[index].setEditable(false)
        items[index].state = 'closed'
        setTimeout(() => edits[index].focus(), 0)
        break
      case 'closed':
        items[index].state = 'opened'
        attachments[index].setEditable(true)
        attachments[index].setContent(cont)
        items[index].content = cont
        attachments[index].focus()
        break
    }
  }

  const onScroll = (row: number, ev: Event) => {
    const target = ev.target as HTMLDivElement
    if (target && !expanded[row] && target.clientHeight < target.scrollHeight) {
      expanded[row] = true
      flip(row)
    }
  }
</script>

<div class="antiAccordion">
  {#each items as item, i}
    <div class="description {item.state}">
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <div
        class="caption"
        class:hasAttachments={hasAttachments && i === items.length - 1}
        use:tooltip={{ label: item.tooltip }}
        tabindex="-1"
        on:click={() => {
          if (item.state === 'closed') edits[i].focus()
          else attachments[i].focus()
        }}
      >
        <span class="label"><Label label={item.label} /></span>
        <div class="value" on:scroll={(ev) => onScroll(i, ev)}>
          {#if item.state === 'closed'}
            <TextEditor
              bind:content={item.content}
              bind:this={edits[i]}
              extensions={[IsEmptyContentExtension.configure({ onChange: (value) => (isEmpty[i] = value) })]}
              on:value={(ev) => {
                dispatch('update', { item, value: ev.detail })
              }}
              on:content={(ev) => {
                if (!isEmpty[i]) {
                  items[i].content = ev.detail
                  dispatch('update', { item, value: ev.detail })
                  flip(i)
                }
              }}
              on:blur={() => dispatch('blur', item)}
            />
          {/if}
        </div>
        <Button size={'medium'} kind={'ghost'} on:click={(ev) => flip(i, ev)}>
          <svelte:fragment slot="icon">
            <div class="rotated-icon {item.state}">
              <IconDownOutline size={'medium'} />
            </div>
          </svelte:fragment>
        </Button>
      </div>
      <div class="expand-collapse" class:hasAttachments={hasAttachments && i === items.length - 1}>
        <AttachmentStyledBox
          bind:this={attachments[i]}
          alwaysEdit
          showButtons
          enableAttachments={!withoutAttach}
          bind:content={item.content}
          placeholder={textEditorPlugin.string.EditorPlaceholder}
          {objectId}
          {_class}
          {space}
          on:changeContent={(ev) => dispatch('update', { item, value: ev.detail })}
          on:attach={(ev) => {
            if (ev && ev.detail.action === 'drop') attachments[attachments.length - 1].fileDrop(ev.detail.event)
            else if (ev.detail.action === 'add') attachments[attachments.length - 1].attach()
            else if (ev.detail.action === 'saved') {
              if (ev.detail.value !== hasAttachments) hasAttachments = ev.detail.value
            }
          }}
          on:blur={() => dispatch('blur', item)}
        />
      </div>
    </div>
  {/each}
</div>
