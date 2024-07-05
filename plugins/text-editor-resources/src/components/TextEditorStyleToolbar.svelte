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
  import { getEventPositionElement, IconSize, SelectPopup, showPopup } from '@hcengineering/ui'
  import { Editor } from '@tiptap/core'
  import { Level } from '@tiptap/extension-heading'
  import textEditor, { TextFormatCategory, TextNodeAction } from '@hcengineering/text-editor'

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
  export let editor: Editor
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
    const link = editor.getAttributes('link').href

    showPopup(LinkPopup, { link }, undefined, undefined, (newLink) => {
      if (newLink === '') {
        editor.chain().focus().extendMarkRange('link').unsetLink().run()
      } else {
        editor.chain().focus().extendMarkRange('link').setLink({ href: newLink }).run()
      }
    })
  }

  function getHeaderToggler (level: Level) {
    return () => {
      editor.commands.toggleHeading({ level })
      dispatch('focus')
    }
  }

  function tableOptions (event: MouseEvent): void {
    const ops = [
      {
        id: '#addColumnBefore',
        icon: AddColBefore,
        label: textEditor.string.AddColumnBefore,
        action: () => editor.commands.addColumnBefore(),
        category: {
          label: textEditor.string.CategoryColumn
        }
      },
      {
        id: '#addColumnAfter',
        icon: AddColAfter,
        label: textEditor.string.AddColumnAfter,
        action: () => editor.commands.addColumnAfter(),
        category: {
          label: textEditor.string.CategoryColumn
        }
      },

      {
        id: '#deleteColumn',
        icon: DeleteCol,
        label: textEditor.string.DeleteColumn,
        action: () => editor.commands.deleteColumn(),
        category: {
          label: textEditor.string.CategoryColumn
        }
      },
      {
        id: '#addRowBefore',
        icon: AddRowBefore,
        label: textEditor.string.AddRowBefore,
        action: () => editor.commands.addRowBefore(),
        category: {
          label: textEditor.string.CategoryRow
        }
      },
      {
        id: '#addRowAfter',
        icon: AddRowAfter,
        label: textEditor.string.AddRowAfter,
        action: () => editor.commands.addRowAfter(),
        category: {
          label: textEditor.string.CategoryRow
        }
      },
      {
        id: '#deleteRow',
        icon: DeleteRow,
        label: textEditor.string.DeleteRow,
        action: () => editor.commands.deleteRow(),
        category: {
          label: textEditor.string.CategoryRow
        }
      },
      {
        id: '#deleteTable',
        icon: DeleteTable,
        label: textEditor.string.DeleteTable,
        action: () => editor.commands.deleteTable(),
        category: {
          label: textEditor.string.Table
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

{#if editor}
  {#each textFormatCategories as category, index}
    {#if index > 0 && (category !== TextFormatCategory.Table || editor.isActive('table'))}
      <div class="buttons-divider" />
    {/if}
    {#if category === TextFormatCategory.Heading}
      <StyleButton
        icon={Header1}
        size={formatButtonSize}
        selected={editor.isActive('heading', { level: 1 })}
        showTooltip={{ label: getEmbeddedLabel('H1') }}
        on:click={getHeaderToggler(1)}
      />
      <StyleButton
        icon={Header2}
        size={formatButtonSize}
        selected={editor.isActive('heading', { level: 2 })}
        showTooltip={{ label: getEmbeddedLabel('H2') }}
        on:click={getHeaderToggler(2)}
      />
      <StyleButton
        icon={Header3}
        size={formatButtonSize}
        selected={editor.isActive('heading', { level: 3 })}
        showTooltip={{ label: getEmbeddedLabel('H3') }}
        on:click={getHeaderToggler(3)}
      />
    {/if}
    {#if category === TextFormatCategory.TextDecoration}
      <StyleButton
        icon={Bold}
        size={formatButtonSize}
        selected={editor.isActive('bold')}
        showTooltip={{ label: textEditor.string.Bold }}
        on:click={getToggler(editor.commands.toggleBold)}
      />
      <StyleButton
        icon={Italic}
        size={formatButtonSize}
        selected={editor.isActive('italic')}
        showTooltip={{ label: textEditor.string.Italic }}
        on:click={getToggler(editor.commands.toggleItalic)}
      />
      <StyleButton
        icon={RIStrikethrough}
        size={formatButtonSize}
        selected={editor.isActive('strike')}
        showTooltip={{ label: textEditor.string.Strikethrough }}
        on:click={getToggler(editor.commands.toggleStrike)}
      />
      <StyleButton
        icon={Underline}
        size={formatButtonSize}
        selected={editor.isActive('underline')}
        showTooltip={{ label: textEditor.string.Underlined }}
        on:click={getToggler(editor.commands.toggleUnderline)}
      />
    {/if}
    {#if category === TextFormatCategory.Link}
      <StyleButton
        icon={Link}
        size={formatButtonSize}
        selected={editor.isActive('link')}
        disabled={editor.view.state.selection.empty && !editor.isActive('link')}
        showTooltip={{ label: textEditor.string.Link }}
        on:click={formatLink}
      />
    {/if}
    {#if category === TextFormatCategory.List}
      <StyleButton
        icon={ListNumber}
        size={formatButtonSize}
        selected={editor.isActive('orderedList')}
        showTooltip={{ label: textEditor.string.OrderedList }}
        on:click={getToggler(editor.commands.toggleOrderedList)}
      />
      <StyleButton
        icon={ListBullet}
        size={formatButtonSize}
        selected={editor.isActive('bulletList')}
        showTooltip={{ label: textEditor.string.BulletedList }}
        on:click={getToggler(editor.commands.toggleBulletList)}
      />
    {/if}
    {#if category === TextFormatCategory.Quote}
      <StyleButton
        icon={Quote}
        size={formatButtonSize}
        selected={editor.isActive('blockquote')}
        showTooltip={{ label: textEditor.string.Blockquote }}
        on:click={getToggler(editor.commands.toggleBlockquote)}
      />
    {/if}
    {#if category === TextFormatCategory.Code}
      <StyleButton
        icon={Code}
        size={formatButtonSize}
        selected={editor.isActive('code')}
        showTooltip={{ label: textEditor.string.Code }}
        on:click={getToggler(editor.commands.toggleCode)}
      />
      <StyleButton
        icon={CodeBlock}
        size={formatButtonSize}
        selected={editor.isActive('codeBlock')}
        showTooltip={{ label: textEditor.string.CodeBlock }}
        on:click={getToggler(editor.commands.toggleCodeBlock)}
      />
    {/if}
    {#if category === TextFormatCategory.Table}
      {#if editor.isActive('table')}
        <StyleButton
          icon={IconTable}
          iconProps={{ style: 'tableProps' }}
          size={formatButtonSize}
          on:click={tableOptions}
          showTooltip={{ label: textEditor.string.TableOptions }}
        />
      {/if}
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
        disabled={editor.view.state.selection.empty}
        showTooltip={{ label: action.label }}
        on:click={() => {
          void action.action({ editor: editor })
        }}
      />
    {/each}
  {/if}
{/if}
