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
  import { createEventDispatcher } from 'svelte'
  import { getEmbeddedLabel } from '@hcengineering/platform'
  import presentation from '@hcengineering/presentation'
  import { getEventPositionElement, IconSize, SelectPopup, showPopup } from '@hcengineering/ui'
  import { Editor } from '@tiptap/core'
  import { Level } from '@tiptap/extension-heading'
  import textEditorPlugin from '../plugin'
  import { TextFormatCategory, TextNodeAction } from '../types'
  import { mInsertTable } from './extensions'
  import Bold from './icons/Bold.svelte'
  import Code from './icons/Code.svelte'
  import CodeBlock from './icons/CodeBlock.svelte'
  import Header1 from './icons/Header1.svelte'
  import Header2 from './icons/Header2.svelte'
  import Header3 from './icons/Header3.svelte'
  import IconTable from './icons/IconTable.svelte'
  import Italic from './icons/Italic.svelte'
  import Link from './icons/Link.svelte'
  import ListBullet from './icons/ListBullet.svelte'
  import ListNumber from './icons/ListNumber.svelte'
  import Quote from './icons/Quote.svelte'
  import RIStrikethrough from './icons/RIStrikethrough.svelte'
  import Underline from './icons/Underline.svelte'
  import AddColAfter from './icons/table/AddColAfter.svelte'
  import AddColBefore from './icons/table/AddColBefore.svelte'
  import AddRowAfter from './icons/table/AddRowAfter.svelte'
  import AddRowBefore from './icons/table/AddRowBefore.svelte'
  import DeleteCol from './icons/table/DeleteCol.svelte'
  import DeleteRow from './icons/table/DeleteRow.svelte'
  import DeleteTable from './icons/table/DeleteTable.svelte'
  import LinkPopup from './LinkPopup.svelte'
  import StyleButton from './StyleButton.svelte'

  export let formatButtonSize: IconSize = 'small'
  export let textEditor: Editor
  export let textFormatCategories: TextFormatCategory[] = []
  export let textNodeActions: TextNodeAction[] = []

  const dispatch = createEventDispatcher()

  function getToggler (toggle: () => void) {
    return () => {
      toggle()
      dispatch('focus')
    }
  }

  async function formatLink (): Promise<void> {
    const link = textEditor.getAttributes('link').href

    showPopup(LinkPopup, { link }, undefined, undefined, (newLink) => {
      if (newLink === '') {
        textEditor.chain().focus().extendMarkRange('link').unsetLink().run()
      } else {
        textEditor.chain().focus().extendMarkRange('link').setLink({ href: newLink }).run()
      }
    })
  }

  function getHeaderToggler (level: Level) {
    return () => {
      textEditor.commands.toggleHeading({ level })
      dispatch('focus')
    }
  }

  function insertTable (event: MouseEvent): void {
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
            textEditor.commands.deleteTable()
            dispatch('focus')
            return
          }
          const tab = mInsertTable.find((it) => it.label === val)
          if (tab !== undefined) {
            textEditor.commands.insertTable({
              cols: tab.cols,
              rows: tab.rows,
              withHeaderRow: tab.header
            })

            dispatch('focus')
          }
        }
      }
    )
  }

  function tableOptions (event: MouseEvent): void {
    const ops = [
      {
        id: '#addColumnBefore',
        icon: AddColBefore,
        label: textEditorPlugin.string.AddColumnBefore,
        action: () => textEditor.commands.addColumnBefore(),
        category: {
          label: textEditorPlugin.string.CategoryColumn
        }
      },
      {
        id: '#addColumnAfter',
        icon: AddColAfter,
        label: textEditorPlugin.string.AddColumnAfter,
        action: () => textEditor.commands.addColumnAfter(),
        category: {
          label: textEditorPlugin.string.CategoryColumn
        }
      },

      {
        id: '#deleteColumn',
        icon: DeleteCol,
        label: textEditorPlugin.string.DeleteColumn,
        action: () => textEditor.commands.deleteColumn(),
        category: {
          label: textEditorPlugin.string.CategoryColumn
        }
      },
      {
        id: '#addRowBefore',
        icon: AddRowBefore,
        label: textEditorPlugin.string.AddRowBefore,
        action: () => textEditor.commands.addRowBefore(),
        category: {
          label: textEditorPlugin.string.CategoryRow
        }
      },
      {
        id: '#addRowAfter',
        icon: AddRowAfter,
        label: textEditorPlugin.string.AddRowAfter,
        action: () => textEditor.commands.addRowAfter(),
        category: {
          label: textEditorPlugin.string.CategoryRow
        }
      },
      {
        id: '#deleteRow',
        icon: DeleteRow,
        label: textEditorPlugin.string.DeleteRow,
        action: () => textEditor.commands.deleteRow(),
        category: {
          label: textEditorPlugin.string.CategoryRow
        }
      },
      {
        id: '#deleteTable',
        icon: DeleteTable,
        label: textEditorPlugin.string.DeleteTable,
        action: () => textEditor.commands.deleteTable(),
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
          if (op !== undefined) {
            op.action()
            dispatch('focus')
          }
        }
      }
    )
  }
</script>

{#if textEditor}
  {#each textFormatCategories as category, index}
    {#if category === TextFormatCategory.Heading}
      <StyleButton
        icon={Header1}
        size={formatButtonSize}
        selected={textEditor.isActive('heading', { level: 1 })}
        showTooltip={{ label: getEmbeddedLabel('H1') }}
        on:click={getHeaderToggler(1)}
      />
      <StyleButton
        icon={Header2}
        size={formatButtonSize}
        selected={textEditor.isActive('heading', { level: 2 })}
        showTooltip={{ label: getEmbeddedLabel('H2') }}
        on:click={getHeaderToggler(2)}
      />
      <StyleButton
        icon={Header3}
        size={formatButtonSize}
        selected={textEditor.isActive('heading', { level: 3 })}
        showTooltip={{ label: getEmbeddedLabel('H3') }}
        on:click={getHeaderToggler(3)}
      />
    {/if}
    {#if category === TextFormatCategory.TextDecoration}
      <StyleButton
        icon={Bold}
        size={formatButtonSize}
        selected={textEditor.isActive('bold')}
        showTooltip={{ label: textEditorPlugin.string.Bold }}
        on:click={getToggler(textEditor.commands.toggleBold)}
      />
      <StyleButton
        icon={Italic}
        size={formatButtonSize}
        selected={textEditor.isActive('italic')}
        showTooltip={{ label: textEditorPlugin.string.Italic }}
        on:click={getToggler(textEditor.commands.toggleItalic)}
      />
      <StyleButton
        icon={RIStrikethrough}
        size={formatButtonSize}
        selected={textEditor.isActive('strike')}
        showTooltip={{ label: textEditorPlugin.string.Strikethrough }}
        on:click={getToggler(textEditor.commands.toggleStrike)}
      />
      <StyleButton
        icon={Underline}
        size={formatButtonSize}
        selected={textEditor.isActive('underline')}
        showTooltip={{ label: textEditorPlugin.string.Underlined }}
        on:click={getToggler(textEditor.commands.toggleUnderline)}
      />
    {/if}
    {#if category === TextFormatCategory.Link}
      <StyleButton
        icon={Link}
        size={formatButtonSize}
        selected={textEditor.isActive('link')}
        disabled={textEditor.view.state.selection.empty && !textEditor.isActive('link')}
        showTooltip={{ label: textEditorPlugin.string.Link }}
        on:click={formatLink}
      />
    {/if}
    {#if category === TextFormatCategory.List}
      <StyleButton
        icon={ListNumber}
        size={formatButtonSize}
        selected={textEditor.isActive('orderedList')}
        showTooltip={{ label: textEditorPlugin.string.OrderedList }}
        on:click={getToggler(textEditor.commands.toggleOrderedList)}
      />
      <StyleButton
        icon={ListBullet}
        size={formatButtonSize}
        selected={textEditor.isActive('bulletList')}
        showTooltip={{ label: textEditorPlugin.string.BulletedList }}
        on:click={getToggler(textEditor.commands.toggleBulletList)}
      />
    {/if}
    {#if category === TextFormatCategory.Quote}
      <StyleButton
        icon={Quote}
        size={formatButtonSize}
        selected={textEditor.isActive('blockquote')}
        showTooltip={{ label: textEditorPlugin.string.Blockquote }}
        on:click={getToggler(textEditor.commands.toggleBlockquote)}
      />
    {/if}
    {#if category === TextFormatCategory.Code}
      <StyleButton
        icon={Code}
        size={formatButtonSize}
        selected={textEditor.isActive('code')}
        showTooltip={{ label: textEditorPlugin.string.Code }}
        on:click={getToggler(textEditor.commands.toggleCode)}
      />
      <StyleButton
        icon={CodeBlock}
        size={formatButtonSize}
        selected={textEditor.isActive('codeBlock')}
        showTooltip={{ label: textEditorPlugin.string.CodeBlock }}
        on:click={getToggler(textEditor.commands.toggleCodeBlock)}
      />
    {/if}
    {#if category === TextFormatCategory.Table}
      <StyleButton
        icon={IconTable}
        iconProps={{ style: 'table' }}
        size={formatButtonSize}
        selected={textEditor.isActive('table')}
        on:click={insertTable}
        showTooltip={{ label: textEditorPlugin.string.InsertTable }}
      />
      {#if textEditor.isActive('table')}
        <StyleButton
          icon={IconTable}
          iconProps={{ style: 'tableProps' }}
          size={formatButtonSize}
          on:click={tableOptions}
          showTooltip={{ label: textEditorPlugin.string.TableOptions }}
        />
      {/if}
    {/if}
    {#if index < textFormatCategories.length - 1}
      <div class="buttons-divider" />
    {/if}
  {/each}
  {#if textFormatCategories.length > 0 && textNodeActions.length > 0}
    <div class="buttons-divider" />
  {/if}
  {#if textNodeActions.length > 0}
    {#each textNodeActions as action}
      <StyleButton
        icon={action.icon}
        size={formatButtonSize}
        selected={false}
        disabled={textEditor.view.state.selection.empty}
        showTooltip={{ label: action.label }}
        on:click={() => {
          void action.action({ editor: textEditor })
        }}
      />
    {/each}
  {/if}
{/if}
