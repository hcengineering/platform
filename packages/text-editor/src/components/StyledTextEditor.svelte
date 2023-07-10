<!--
// Copyright © 2020 Anticrm Platform Contributors.
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
  import { Asset, getEmbeddedLabel, getResource, IntlString } from '@hcengineering/platform'
  import presentation, { getClient } from '@hcengineering/presentation'
  import {
    AnySvelteComponent,
    EmojiPopup,
    getEventPositionElement,
    IconEmoji,
    IconSize,
    Scroller,
    SelectPopup,
    showPopup,
    deviceOptionsStore as deviceInfo,
    checkAdaptiveMatching
  } from '@hcengineering/ui'
  import { Level } from '@tiptap/extension-heading'
  import { createEventDispatcher } from 'svelte'
  import textEditorPlugin from '../plugin'
  import { FORMAT_MODES, FormatMode, RefInputAction, RefInputActionItem, TextEditorHandler } from '../types'
  import { headingLevels, mInsertTable } from './extensions'
  import Attach from './icons/Attach.svelte'
  import Bold from './icons/Bold.svelte'
  import Code from './icons/Code.svelte'
  import CodeBlock from './icons/CodeBlock.svelte'
  import Header from './icons/Header.svelte'
  import IconTable from './icons/IconTable.svelte'
  import Italic from './icons/Italic.svelte'
  import Link from './icons/Link.svelte'
  import ListBullet from './icons/ListBullet.svelte'
  import ListNumber from './icons/ListNumber.svelte'
  import Quote from './icons/Quote.svelte'
  import RIBold from './icons/RIBold.svelte'
  import RICode from './icons/RICode.svelte'
  import RIItalic from './icons/RIItalic.svelte'
  import RILink from './icons/RILink.svelte'
  import RIStrikethrough from './icons/RIStrikethrough.svelte'
  import Strikethrough from './icons/Strikethrough.svelte'
  // import RIMention from './icons/RIMention.svelte'
  import { AnyExtension } from '@tiptap/core'
  import AddColAfter from './icons/table/AddColAfter.svelte'
  import AddColBefore from './icons/table/AddColBefore.svelte'
  import AddRowAfter from './icons/table/AddRowAfter.svelte'
  import AddRowBefore from './icons/table/AddRowBefore.svelte'
  import DeleteCol from './icons/table/DeleteCol.svelte'
  import DeleteRow from './icons/table/DeleteRow.svelte'
  import DeleteTable from './icons/table/DeleteTable.svelte'
  import TextStyle from './icons/TextStyle.svelte'
  import LinkPopup from './LinkPopup.svelte'
  import StyleButton from './StyleButton.svelte'
  import TextEditor from './TextEditor.svelte'
  import { Node as ProseMirrorNode } from '@tiptap/pm/model'

  const dispatch = createEventDispatcher()

  export let content: string = ''
  export let placeholder: IntlString = textEditorPlugin.string.EditorPlaceholder
  export let showButtons: boolean = true
  export let hideAttachments: boolean = false
  export let buttonSize: IconSize = 'medium'
  export let formatButtonSize: IconSize = 'small'
  export let isScrollable: boolean = true
  export let focusable: boolean = false
  export let maxHeight: 'max' | 'card' | 'limited' | string | undefined = undefined
  export let withoutTopBorder = false
  export let enableFormatting = false
  export let autofocus = false
  export let full = false
  export let extensions: AnyExtension[] = []

  let textEditor: TextEditor
  let isEmpty = true
  let contentHeight: number

  export function submit (): void {
    textEditor.submit()
  }
  export function focus (): void {
    textEditor.focus()
  }
  export function isEditable (): boolean {
    return textEditor.isEditable()
  }
  export function setEditable (editable: boolean): void {
    textEditor.setEditable(editable)
  }
  export function getContent (): string {
    return content
  }
  export function setContent (data: string): void {
    textEditor.setContent(data)
  }
  export function isEmptyContent (): boolean {
    return textEditor.isEmptyContent()
  }
  export function insertText (text: string): void {
    textEditor.insertText(text)
  }
  export function catHandleTab (): boolean {
    return (
      textEditor.checkIsActive('bulletList') ||
      textEditor.checkIsActive('orderedList') ||
      textEditor.checkIsActive('code') ||
      textEditor.checkIsActive('codeBlock')
    )
  }

  $: varsStyle =
    maxHeight === 'card'
      ? 'calc(70vh - 12.5rem)'
      : maxHeight === 'limited'
        ? '12.5rem'
        : maxHeight === 'max'
          ? 'max-content'
          : maxHeight

  let isFormatting = enableFormatting
  let activeModes = new Set<FormatMode>()
  let isSelectionEmpty = true

  interface RefAction {
    label: IntlString
    icon: Asset | AnySvelteComponent
    action: RefInputAction
    order: number
    hidden?: boolean
  }
  const defActions: RefAction[] = [
    {
      label: textEditorPlugin.string.Attach,
      icon: Attach,
      action: () => {
        dispatch('attach')
      },
      order: 1001
    },
    {
      label: textEditorPlugin.string.Link,
      icon: RILink,
      action: () => {
        if (!(isSelectionEmpty && !activeModes.has('link'))) formatLink()
      },
      order: 2000
    },
    // {
    //   label: textEditorPlugin.string.Mention,
    //   icon: RIMention,
    //   action: () => textEditor.insertText('@'),
    //   order: 3000
    // },
    {
      label: textEditorPlugin.string.Emoji,
      icon: IconEmoji,
      action: (element) => {
        showPopup(
          EmojiPopup,
          {},
          element,
          (emoji) => {
            if (!emoji) return
            textEditor.insertText(emoji)
            textEditor.focus()
          },
          () => {}
        )
      },
      order: 4001
    },
    {
      label: textEditorPlugin.string.TextStyle,
      icon: TextStyle,
      action: () => {
        isFormatting = !isFormatting
        textEditor.focus()
      },
      order: 6000
    },
    {
      label: textEditorPlugin.string.Bold,
      icon: RIBold,
      action: () => {
        textEditor.toggleBold()
        textEditor.focus()
      },
      order: 6010
    },
    {
      label: textEditorPlugin.string.Italic,
      icon: RIItalic,
      action: () => {
        textEditor.toggleItalic()
        textEditor.focus()
      },
      order: 6020
    },
    {
      label: textEditorPlugin.string.Strikethrough,
      icon: RIStrikethrough,
      action: () => {
        textEditor.toggleStrike()
        textEditor.focus()
      },
      order: 6030
    },
    {
      label: textEditorPlugin.string.Code,
      icon: RICode,
      action: () => {
        textEditor.toggleCode()
        textEditor.focus()
      },
      order: 6040
    }
  ]

  const client = getClient()
  let actions: RefAction[] = []
  client.findAll<RefInputActionItem>(textEditorPlugin.class.RefInputActionItem, {}).then(async (res) => {
    const cont: RefAction[] = []
    for (const r of res) {
      cont.push({
        label: r.label,
        icon: r.icon,
        order: r.order ?? 10000,
        action: await getResource(r.action)
      })
    }
    actions = defActions.concat(...cont).sort((a, b) => a.order - b.order)
  })

  function updateFormattingState () {
    if (textEditor?.checkIsActive === undefined) {
      return
    }
    activeModes = new Set(FORMAT_MODES.filter(textEditor.checkIsActive))
    for (const l of headingLevels) {
      if (textEditor.checkIsActive('heading', { level: l })) {
        headingLevel = l
        activeModes.add('heading')
      }
    }
    if (!activeModes.has('heading')) {
      headingLevel = 0
    }
    isSelectionEmpty = textEditor.checkIsSelectionEmpty()
  }
  // function updateFormattingState () {
  //   activeModes = new Set(FORMAT_MODES.filter(textEditor.checkIsActive))
  //   isSelectionEmpty = textEditor.checkIsSelectionEmpty()
  // }

  function getToggler (toggle: () => void) {
    return () => {
      toggle()
      textEditor.focus()
      updateFormattingState()
    }
  }

  async function formatLink (): Promise<void> {
    const link = textEditor.getLink()

    showPopup(LinkPopup, { link }, undefined, undefined, (newLink) => {
      if (newLink === '') {
        textEditor.unsetLink()
      } else {
        textEditor.setLink(newLink)
      }
    })
  }
  const editorHandler: TextEditorHandler = {
    insertText: (text) => {
      textEditor.insertText(text)
    },
    insertTemplate: (name, text) => {
      textEditor.insertText(text)
      dispatch('template', name)
    }
  }
  function handleAction (a: RefAction, evt?: Event): void {
    a.action(evt?.target as HTMLElement, editorHandler)
  }

  let needFocus = autofocus
  const focused = false

  $: if (textEditor && needFocus) {
    if (!focused) textEditor.focus()
    needFocus = false
  }

  let headingLevel = 0

  function toggleHeader (event: MouseEvent) {
    if (activeModes.has('heading')) {
      textEditor.toggleHeading({ level: headingLevel as Level })
      needFocus = true
      updateFormattingState()
    } else {
      showPopup(
        SelectPopup,
        {
          value: Array.from(headingLevels).map((it) => ({ id: it.toString(), text: it.toString() }))
        },
        getEventPositionElement(event),
        (val) => {
          if (val !== undefined) {
            textEditor.toggleHeading({ level: parseInt(val) as Level })
            needFocus = true
            updateFormattingState()
          }
        }
      )
    }
  }

  function insertTable (event: MouseEvent) {
    showPopup(
      SelectPopup,
      {
        value: [
          { id: '#delete', label: presentation.string.Remove },
          ...mInsertTable.map((it) => ({ id: it.label, text: it.label }))
        ]
      },
      getEventPositionElement(event),
      (val) => {
        if (val !== undefined) {
          if (val === '#delete') {
            textEditor.deleteTable()
            needFocus = true
            updateFormattingState()
            return
          }
          const tab = mInsertTable.find((it) => it.label === val)
          if (tab) {
            textEditor.insertTable({
              cols: tab.cols,
              rows: tab.rows,
              withHeaderRow: tab.header
            })

            needFocus = true
            updateFormattingState()
          }
        }
      }
    )
  }

  function tableOptions (event: MouseEvent) {
    const ops = [
      {
        id: '#addColumnBefore',
        icon: AddColBefore,
        label: textEditorPlugin.string.AddColumnBefore,
        action: () => textEditor.addColumnBefore(),
        category: {
          label: textEditorPlugin.string.CategoryColumn
        }
      },
      {
        id: '#addColumnAfter',
        icon: AddColAfter,
        label: textEditorPlugin.string.AddColumnAfter,
        action: () => textEditor.addColumnAfter(),
        category: {
          label: textEditorPlugin.string.CategoryColumn
        }
      },

      {
        id: '#deleteColumn',
        icon: DeleteCol,
        label: textEditorPlugin.string.DeleteColumn,
        action: () => textEditor.deleteColumn(),
        category: {
          label: textEditorPlugin.string.CategoryColumn
        }
      },
      {
        id: '#addRowBefore',
        icon: AddRowBefore,
        label: textEditorPlugin.string.AddRowBefore,
        action: () => textEditor.addRowBefore(),
        category: {
          label: textEditorPlugin.string.CategoryRow
        }
      },
      {
        id: '#addRowAfter',
        icon: AddRowAfter,
        label: textEditorPlugin.string.AddRowAfter,
        action: () => textEditor.addRowAfter(),
        category: {
          label: textEditorPlugin.string.CategoryRow
        }
      },
      {
        id: '#deleteRow',
        icon: DeleteRow,
        label: textEditorPlugin.string.DeleteRow,
        action: () => textEditor.deleteRow(),
        category: {
          label: textEditorPlugin.string.CategoryRow
        }
      },
      {
        id: '#deleteTable',
        icon: DeleteTable,
        label: textEditorPlugin.string.DeleteTable,
        action: () => textEditor.deleteTable(),
        category: {
          label: textEditorPlugin.string.Table
        }
      }
    ]

    showPopup(
      SelectPopup,
      {
        value: ops
      },
      getEventPositionElement(event),
      (val) => {
        if (val !== undefined) {
          const op = ops.find((it) => it.id === val)
          if (op) {
            op.action()
            needFocus = true
            updateFormattingState()
          }
        }
      }
    )
  }

  $: devSize = $deviceInfo.size
  $: buttonsGap = checkAdaptiveMatching(devSize, 'sm') ? 'small-gap' : 'large-gap'
  $: buttonsHeight =
    buttonSize === 'large' || buttonSize === 'x-large' || buttonSize === 'full'
      ? 'h-6 max-h-6'
      : buttonSize === 'medium'
        ? 'h-5 max-h-5'
        : 'h-4 max-h-4'

  /**
   * @public
   */
  export function removeNode (nde: ProseMirrorNode): void {
    textEditor.removeNode(nde)
  }
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<div
  class="ref-container clear-mins"
  class:h-full={full}
  tabindex="-1"
  on:click|preventDefault|stopPropagation={() => (needFocus = true)}
>
  {#if isFormatting}
    <div class="formatPanel buttons-group xsmall-gap mb-4" class:withoutTopBorder>
      <StyleButton
        icon={Header}
        size={formatButtonSize}
        selected={activeModes.has('heading')}
        showTooltip={{ label: getEmbeddedLabel(`H${headingLevel}`) }}
        on:click={toggleHeader}
      />
      <StyleButton
        icon={Bold}
        size={formatButtonSize}
        selected={activeModes.has('bold')}
        showTooltip={{ label: textEditorPlugin.string.Bold }}
        on:click={getToggler(textEditor.toggleBold)}
      />
      <StyleButton
        icon={Italic}
        size={formatButtonSize}
        selected={activeModes.has('italic')}
        showTooltip={{ label: textEditorPlugin.string.Italic }}
        on:click={getToggler(textEditor.toggleItalic)}
      />
      <StyleButton
        icon={Strikethrough}
        size={formatButtonSize}
        selected={activeModes.has('strike')}
        showTooltip={{ label: textEditorPlugin.string.Strikethrough }}
        on:click={getToggler(textEditor.toggleStrike)}
      />
      <StyleButton
        icon={Link}
        size={formatButtonSize}
        selected={activeModes.has('link')}
        disabled={isSelectionEmpty && !activeModes.has('link')}
        showTooltip={{ label: textEditorPlugin.string.Link }}
        on:click={formatLink}
      />
      <div class="buttons-divider" />
      <StyleButton
        icon={ListNumber}
        size={formatButtonSize}
        selected={activeModes.has('orderedList')}
        showTooltip={{ label: textEditorPlugin.string.OrderedList }}
        on:click={getToggler(textEditor.toggleOrderedList)}
      />
      <StyleButton
        icon={ListBullet}
        size={formatButtonSize}
        selected={activeModes.has('bulletList')}
        showTooltip={{ label: textEditorPlugin.string.BulletedList }}
        on:click={getToggler(textEditor.toggleBulletList)}
      />
      <div class="buttons-divider" />
      <StyleButton
        icon={Quote}
        size={formatButtonSize}
        selected={activeModes.has('blockquote')}
        showTooltip={{ label: textEditorPlugin.string.Blockquote }}
        on:click={getToggler(textEditor.toggleBlockquote)}
      />
      <div class="buttons-divider" />
      <StyleButton
        icon={Code}
        size={formatButtonSize}
        selected={activeModes.has('code')}
        showTooltip={{ label: textEditorPlugin.string.Code }}
        on:click={getToggler(textEditor.toggleCode)}
      />
      <StyleButton
        icon={CodeBlock}
        size={formatButtonSize}
        selected={activeModes.has('codeBlock')}
        showTooltip={{ label: textEditorPlugin.string.CodeBlock }}
        on:click={getToggler(textEditor.toggleCodeBlock)}
      />
      <StyleButton
        icon={IconTable}
        iconProps={{ style: 'table' }}
        size={formatButtonSize}
        selected={activeModes.has('table')}
        on:click={insertTable}
        showTooltip={{ label: textEditorPlugin.string.InsertTable }}
      />
      {#if activeModes.has('table')}
        <StyleButton
          icon={IconTable}
          iconProps={{ style: 'tableProps' }}
          size={formatButtonSize}
          on:click={tableOptions}
          showTooltip={{ label: textEditorPlugin.string.TableOptions }}
        />
      {/if}
    </div>
  {/if}
  <div class="textInput" class:focusable>
    <div
      bind:clientHeight={contentHeight}
      class="inputMsg"
      class:scrollable={isScrollable}
      class:showScroll={contentHeight > 32}
      style="--texteditor-maxheight: {varsStyle};"
    >
      {#if isScrollable}
        <Scroller>
          <TextEditor
            bind:content
            {placeholder}
            {extensions}
            bind:this={textEditor}
            bind:isEmpty
            on:value
            on:content={(ev) => {
              dispatch('message', ev.detail)
              content = ''
              textEditor.clear()
            }}
            on:blur
            on:focus
            supportSubmit={false}
            on:selection-update={updateFormattingState}
          />
        </Scroller>
      {:else}
        <TextEditor
          bind:content
          {placeholder}
          {extensions}
          bind:this={textEditor}
          bind:isEmpty
          on:value
          on:content={(ev) => {
            dispatch('message', ev.detail)
            content = ''
            textEditor.clear()
          }}
          on:blur
          on:focus
          supportSubmit={false}
          on:selection-update={updateFormattingState}
        />
      {/if}
    </div>
  </div>
  {#if showButtons}
    <div class="flex-between">
      <div class="buttons-group {buttonsGap} mt-3">
        {#each actions.filter((it) => it.hidden !== true) as a}
          <StyleButton icon={a.icon} size={buttonSize} on:click={(evt) => handleAction(a, evt)} />
          {#if a.order % 10 === 1}
            <div class="buttons-divider {buttonsHeight}" />
          {/if}
        {/each}
        <slot />
      </div>
      {#if $$slots.right}
        <div class="buttons-group {buttonsGap} mt-3">
          <slot name="right" />
        </div>
      {/if}
    </div>
  {/if}
</div>

<style lang="scss">
  .ref-container {
    flex-grow: 1;
    display: flex;
    flex-direction: column;
    min-height: 1.25rem;

    .textInput {
      flex-grow: 1;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      min-height: 1.25rem;
      background-color: transparent;

      .inputMsg {
        align-self: stretch;
        width: 100%;
        min-height: 0;
        color: var(--theme-caption-color);
        background-color: transparent;

        :global(.ProseMirror) {
          min-height: 0;
          // max-height: 100%;
          height: 100%;
        }
        &.scrollable {
          max-height: var(--texteditor-maxheight);

          &.showScroll {
            overflow: auto;
          }
        }
        &:not(.showScroll) {
          overflow-y: hidden;

          &::-webkit-scrollbar-thumb {
            background-color: transparent;
          }
        }
      }

      &.focusable {
        margin: -0.25rem -0.5rem;
        padding: 0.25rem 0.5rem;
        border: 1px solid transparent;
        border-radius: 0.25rem;

        &:focus-within {
          border-color: var(--primary-edit-border-color);
        }
      }
    }
    &:focus-within .formatPanel {
      position: sticky;
      top: 1.25rem;
    }
    .formatPanel {
      margin: -0.5rem -0.25rem 0.5rem;
      padding: 0.375rem;
      background-color: var(--theme-comp-header-color);
      border-radius: 0.5rem;
      box-shadow: var(--theme-popup-shadow);
      z-index: 1;
    }
  }
</style>
