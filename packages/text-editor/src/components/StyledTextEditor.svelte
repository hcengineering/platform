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
  import { IntlString, getEmbeddedLabel } from '@hcengineering/platform'
  import {
    IconSize,
    Scroller,
    showPopup,
    SelectPopup,
    AnySvelteComponent,
    getEventPositionElement
  } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import textEditorPlugin from '../plugin'
  import EmojiPopup from './EmojiPopup.svelte'
  import Emoji from './icons/Emoji.svelte'
  import TextStyle from './icons/TextStyle.svelte'
  import TextEditor from './TextEditor.svelte'
  import { Asset } from '@hcengineering/platform'
  import { FormatMode, FORMAT_MODES, RefInputAction, TextEditorHandler } from '../types'
  import { headingLevels, mInsertTable } from './extensions'
  import { Level } from '@tiptap/extension-heading'
  import presentation from '@hcengineering/presentation'
  import Header from './icons/Header.svelte'
  import IconTable from './icons/IconTable.svelte'
  import Attach from './icons/Attach.svelte'
  import Bold from './icons/Bold.svelte'
  import Code from './icons/Code.svelte'
  import CodeBlock from './icons/CodeBlock.svelte'
  import Italic from './icons/Italic.svelte'
  import Link from './icons/Link.svelte'
  import ListBullet from './icons/ListBullet.svelte'
  import ListNumber from './icons/ListNumber.svelte'
  import Quote from './icons/Quote.svelte'
  import Strikethrough from './icons/Strikethrough.svelte'
  import LinkPopup from './LinkPopup.svelte'
  import StyleButton from './StyleButton.svelte'
  import AddRowBefore from './icons/table/AddRowBefore.svelte'
  import AddRowAfter from './icons/table/AddRowAfter.svelte'
  import AddColBefore from './icons/table/AddColBefore.svelte'
  import AddColAfter from './icons/table/AddColAfter.svelte'
  import DeleteRow from './icons/table/DeleteRow.svelte'
  import DeleteCol from './icons/table/DeleteCol.svelte'
  import DeleteTable from './icons/table/DeleteTable.svelte'

  const dispatch = createEventDispatcher()

  export let content: string = ''
  export let placeholder: IntlString = textEditorPlugin.string.EditorPlaceholder
  export let showButtons: boolean = true
  export let showAttach: boolean = false
  export let buttonSize: IconSize = 'large'
  export let isScrollable: boolean = true
  export let focusable: boolean = false
  export let maxHeight: 'max' | 'card' | 'limited' | string | undefined = undefined
  export let withoutTopBorder = false
  export let enableFormatting = false

  let textEditor: TextEditor

  export function submit (): void {
    textEditor.submit()
  }
  export function focus (): void {
    textEditor.focus()
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
  let defActions: RefAction[]
  $: defActions = [
    {
      label: textEditorPlugin.string.Attach,
      icon: Attach,
      action: () => {
        dispatch('attach')
      },
      order: 1000,
      hidden: showAttach
    },
    {
      label: textEditorPlugin.string.TextStyle,
      icon: TextStyle,
      action: () => {
        isFormatting = !isFormatting
        textEditor.focus()
      },
      order: 2000
    },
    {
      label: textEditorPlugin.string.Emoji,
      icon: Emoji,
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
      order: 3000
    }
    // {
    //   label: textEditorPlugin.string.GIF,
    //   icon: GIF,
    //   action: () => {},
    //   order: 4000
    // }
  ]

  function updateFormattingState () {
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
    }
  }
  function handleAction (a: RefAction, evt?: Event): void {
    a.action(evt?.target as HTMLElement, editorHandler)
  }

  let needFocus = false
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
</script>

<div class="ref-container clear-mins">
  {#if isFormatting}
    <div class="formatPanel buttons-group xsmall-gap mb-4" class:withoutTopBorder>
      <StyleButton
        icon={Header}
        size={buttonSize}
        selected={activeModes.has('heading')}
        showTooltip={{ label: getEmbeddedLabel(`H${headingLevel}`) }}
        on:click={toggleHeader}
      />
      <StyleButton
        icon={Bold}
        size={buttonSize}
        selected={activeModes.has('bold')}
        showTooltip={{ label: textEditorPlugin.string.Bold }}
        on:click={getToggler(textEditor.toggleBold)}
      />
      <StyleButton
        icon={Italic}
        size={buttonSize}
        selected={activeModes.has('italic')}
        showTooltip={{ label: textEditorPlugin.string.Italic }}
        on:click={getToggler(textEditor.toggleItalic)}
      />
      <StyleButton
        icon={Strikethrough}
        size={buttonSize}
        selected={activeModes.has('strike')}
        showTooltip={{ label: textEditorPlugin.string.Strikethrough }}
        on:click={getToggler(textEditor.toggleStrike)}
      />
      <StyleButton
        icon={Link}
        size={buttonSize}
        selected={activeModes.has('link')}
        disabled={isSelectionEmpty && !activeModes.has('link')}
        showTooltip={{ label: textEditorPlugin.string.Link }}
        on:click={formatLink}
      />
      <div class="buttons-divider" />
      <StyleButton
        icon={ListNumber}
        size={buttonSize}
        selected={activeModes.has('orderedList')}
        showTooltip={{ label: textEditorPlugin.string.OrderedList }}
        on:click={getToggler(textEditor.toggleOrderedList)}
      />
      <StyleButton
        icon={ListBullet}
        size={buttonSize}
        selected={activeModes.has('bulletList')}
        showTooltip={{ label: textEditorPlugin.string.BulletedList }}
        on:click={getToggler(textEditor.toggleBulletList)}
      />
      <div class="buttons-divider" />
      <StyleButton
        icon={Quote}
        size={buttonSize}
        selected={activeModes.has('blockquote')}
        showTooltip={{ label: textEditorPlugin.string.Blockquote }}
        on:click={getToggler(textEditor.toggleBlockquote)}
      />
      <div class="buttons-divider" />
      <StyleButton
        icon={Code}
        size={buttonSize}
        selected={activeModes.has('code')}
        showTooltip={{ label: textEditorPlugin.string.Code }}
        on:click={getToggler(textEditor.toggleCode)}
      />
      <StyleButton
        icon={CodeBlock}
        size={buttonSize}
        selected={activeModes.has('codeBlock')}
        showTooltip={{ label: textEditorPlugin.string.CodeBlock }}
        on:click={getToggler(textEditor.toggleCodeBlock)}
      />
      <StyleButton
        icon={IconTable}
        iconProps={{ style: 'table' }}
        size={buttonSize}
        selected={activeModes.has('table')}
        on:click={insertTable}
        showTooltip={{ label: textEditorPlugin.string.InsertTable }}
      />
      {#if activeModes.has('table')}
        <StyleButton
          icon={IconTable}
          iconProps={{ style: 'tableProps' }}
          size={buttonSize}
          on:click={tableOptions}
          showTooltip={{ label: textEditorPlugin.string.TableOptions }}
        />
      {/if}
    </div>
  {/if}
  <div class="textInput" class:focusable>
    <div class="inputMsg" class:scrollable={isScrollable} style="--texteditor-maxheight: {varsStyle};">
      {#if isScrollable}
        <Scroller>
          <TextEditor
            bind:content
            {placeholder}
            bind:this={textEditor}
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
          bind:this={textEditor}
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
    <div class="buttons-group xsmall-gap mt-4">
      {#each defActions.filter((it) => it.hidden === undefined || it.hidden === true) as a}
        <StyleButton icon={a.icon} size={buttonSize} on:click={(evt) => handleAction(a, evt)} />
      {/each}
      <div class="flex-grow">
        <slot />
      </div>
    </div>
  {/if}
</div>

<style lang="scss">
  .ref-container {
    flex-grow: 1;
    display: flex;
    flex-direction: column;
    min-height: 4.5rem;

    .textInput {
      flex-grow: 1;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      min-height: 2.75rem;
      background-color: transparent;

      .inputMsg {
        align-self: stretch;
        width: 100%;
        min-height: 0;
        color: var(--content-color);
        background-color: transparent;

        :global(.ProseMirror) {
          min-height: 0;
          // max-height: 100%;
          height: 100%;
        }

        &.scrollable {
          overflow: auto;
          max-height: var(--texteditor-maxheight);
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
    .formatPanel {
      position: sticky;
      top: 1.25rem;
      margin: -0.5rem -0.5rem 0.25rem;
      padding: 0.5rem;
      background-color: var(--body-accent);
      border-radius: 0.5rem;
      box-shadow: var(--button-shadow);
      z-index: 1;
    }
  }
</style>
