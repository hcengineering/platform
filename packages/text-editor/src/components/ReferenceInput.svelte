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
  import { Asset, getResource, IntlString } from '@anticrm/platform'
  import presentation, { getClient, ObjectSearchCategory } from '@anticrm/presentation'
  import { AnySvelteComponent, Icon, Button, Tooltip, showPopup } from '@anticrm/ui'
  import { AnyExtension } from '@tiptap/core'
  import { createEventDispatcher } from 'svelte'
  import { Completion } from '../Completion'
  import textEditorPlugin from '../plugin'
  import { RefInputAction, RefInputActionItem, TextEditorHandler, FORMAT_MODES, FormatMode } from '../types'
  import Attach from './icons/Attach.svelte'
  import Bold from './icons/Bold.svelte'
  import Italic from './icons/Italic.svelte'
  import Strikethrough from './icons/Strikethrough.svelte'
  import ListNumber from './icons/ListNumber.svelte'
  import ListBullet from './icons/ListBullet.svelte'
  import Quote from './icons/Quote.svelte'
  import Code from './icons/Code.svelte'
  import CodeBlock from './icons/CodeBlock.svelte'
  import Emoji from './icons/Emoji.svelte'
  import GIF from './icons/GIF.svelte'
  import Send from './icons/Send.svelte'
  import TextStyle from './icons/TextStyle.svelte'
  import MentionList from './MentionList.svelte'
  import { SvelteRenderer } from './SvelteRenderer'
  import TextEditor from './TextEditor.svelte'
  import LinkPopup from './LinkPopup.svelte'

  const dispatch = createEventDispatcher()
  export let content: string = ''
  export let showSend = true
  export let withoutTopBorder = false
  const client = getClient()

  let textEditor: TextEditor
  let isFormatting = false
  let activeModes = new Set<FormatMode>()
  let isSelectionEmpty = true

  export let categories: ObjectSearchCategory[] = []

  client.findAll(presentation.class.ObjectSearchCategory, {}).then((r) => {
    categories = r
  })
  interface RefAction {
    label: IntlString
    icon: Asset | AnySvelteComponent
    action: RefInputAction
    order: number
  }
  const defActions: RefAction[] = [
    {
      label: textEditorPlugin.string.Attach,
      icon: Attach,
      action: () => {
        dispatch('attach')
      },
      order: 1000
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
      action: () => {},
      order: 3000
    },
    {
      label: textEditorPlugin.string.GIF,
      icon: GIF,
      action: () => {},
      order: 4000
    }
  ]

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

  // Current selected category
  let category: ObjectSearchCategory | undefined = categories[0]

  $: if (categories.length > 0 && category === undefined) {
    category = categories[0]
  }

  export function submit (): void {
    textEditor.submit()
  }

  const editorExtensions: AnyExtension[] = [
    Completion.configure({
      HTMLAttributes: {
        class: 'reference'
      },
      suggestion: {
        items: async (query: { query: string }) => {
          if (category !== undefined) {
            const f = await getResource(category.query)
            return await f(client, query.query)
          }
          return []
        },
        render: () => {
          let component: any

          return {
            onStart: (props: any) => {
              component = new SvelteRenderer(MentionList, {
                ...props,
                close: () => {
                  component.destroy()
                },
                categories,
                category,
                onCategory: (cat: ObjectSearchCategory) => {
                  category = cat
                }
              })
            },
            onUpdate (props: any) {
              component.updateProps(props)
            },
            onKeyDown (props: any) {
              return component.onKeyDown(props)
            },
            onExit () {
              component.destroy()
            }
          }
        }
      }
    })
  ]

  const editorHandler: TextEditorHandler = {
    insertText: (text) => {
      textEditor.insertText(text)
    }
  }
  function handleAction (a: RefAction, evt?: Event): void {
    a.action(evt?.target as HTMLElement, editorHandler)
  }

  function updateFormattingState () {
    activeModes = new Set(FORMAT_MODES.filter(textEditor.checkIsActive))
    isSelectionEmpty = textEditor.checkIsSelectionEmpty()
  }

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
</script>

<div class="ref-container">
  {#if isFormatting}
    <div class="formatPanel buttons-group xsmall-gap" class:withoutTopBorder>
      <Tooltip label={textEditorPlugin.string.Bold}>
        <Button
          icon={Bold}
          kind={'transparent'}
          size={'small'}
          selected={activeModes.has('bold')}
          on:click={getToggler(textEditor.toggleBold)}
        />
      </Tooltip>
      <Tooltip label={textEditorPlugin.string.Italic}>
        <Button
          icon={Italic}
          kind={'transparent'}
          size={'small'}
          selected={activeModes.has('italic')}
          on:click={getToggler(textEditor.toggleItalic)}
        />
      </Tooltip>
      <Tooltip label={textEditorPlugin.string.Strikethrough}>
        <Button
          icon={Strikethrough}
          kind={'transparent'}
          size={'small'}
          selected={activeModes.has('strike')}
          on:click={getToggler(textEditor.toggleStrike)}
        />
      </Tooltip>
      <Tooltip label={textEditorPlugin.string.Link}>
        <Button
          kind={'transparent'}
          size={'small'}
          selected={activeModes.has('link')}
          disabled={isSelectionEmpty && !activeModes.has('link')}
          on:click={formatLink}
        />
      </Tooltip>
      <div class="buttons-divider" />
      <Tooltip label={textEditorPlugin.string.OrderedList}>
        <Button
          icon={ListNumber}
          kind={'transparent'}
          size={'small'}
          selected={activeModes.has('orderedList')}
          on:click={getToggler(textEditor.toggleOrderedList)}
        />
      </Tooltip>
      <Tooltip label={textEditorPlugin.string.BulletedList}>
        <Button
          icon={ListBullet}
          kind={'transparent'}
          size={'small'}
          selected={activeModes.has('bulletList')}
          on:click={getToggler(textEditor.toggleBulletList)}
        />
      </Tooltip>
      <div class="buttons-divider" />
      <Tooltip label={textEditorPlugin.string.Blockquote}>
        <Button
          icon={Quote}
          kind={'transparent'}
          size={'small'}
          selected={activeModes.has('blockquote')}
          on:click={getToggler(textEditor.toggleBlockquote)}
        />
      </Tooltip>
      <div class="buttons-divider" />
      <Tooltip label={textEditorPlugin.string.Code}>
        <Button
          icon={Code}
          kind={'transparent'}
          size={'small'}
          selected={activeModes.has('code')}
          on:click={getToggler(textEditor.toggleCode)}
        />
      </Tooltip>
      <Tooltip label={textEditorPlugin.string.CodeBlock}>
        <Button
          icon={CodeBlock}
          kind={'transparent'}
          size={'small'}
          selected={activeModes.has('codeBlock')}
          on:click={getToggler(textEditor.toggleCodeBlock)}
        />
      </Tooltip>
    </div>
  {/if}
  <div class="textInput" class:withoutTopBorder={withoutTopBorder || isFormatting}>
    <div class="inputMsg">
      <TextEditor
        bind:content
        bind:this={textEditor}
        on:content={(ev) => {
          dispatch('message', ev.detail)
          content = ''
          textEditor.clear()
        }}
        extensions={editorExtensions}
        on:selection-update={updateFormattingState}
      />
    </div>
    {#if showSend}
      <button class="sendButton" on:click={submit}><div class="icon"><Send size={'medium'} /></div></button>
    {/if}
  </div>
  <div class="buttons">
    {#each actions as a}
      <div class="tool" on:click={(evt) => handleAction(a, evt)}>
        <Icon icon={a.icon} size={'large'} />
      </div>
    {/each}
  </div>
</div>

<style lang="scss">
  .ref-container {
    display: flex;
    flex-direction: column;
    min-height: 4.5rem;

    .formatPanel {
      padding: 0.5rem;
      background-color: var(--body-accent);
      border: 1px solid var(--divider-color);
      border-radius: 0.75rem 0.75rem 0 0;
      border-bottom: 0;

      &.withoutTopBorder {
        border-radius: 0;
      }
      & + .textInput {
        border-top: none;
      }
    }

    .textInput {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      min-height: 2.75rem;
      padding: 0.75rem 1rem;
      background-color: var(--accent-bg-color);
      border: 1px solid var(--divider-color);
      border-radius: 0.75rem;

      &.withoutTopBorder {
        border-top-left-radius: 0;
        border-top-right-radius: 0;
      }

      .inputMsg {
        display: flex;
        align-self: center;
        align-items: center;
        width: 100%;
        height: 100%;
        color: var(--theme-content-color);
        background-color: transparent;
        border: none;
        outline: none;
        // &.thread {
        //   width: auto;
        // }

        // .flex-column {
        //   display: flex;
        //   flex-direction: column;
        //   align-items: center;
        // }

        // .flex-row {
        //   display: flex;
        //   flex-direction: row;
        //   align-items: flex-end;
        // }

        // .edit-box-horizontal {
        //   width: 100%;
        //   height: 100%;
        //   margin-top: 7px;
        //   align-self: center;
        // }

        // .edit-box-vertical {
        //   width: 100%;
        //   height: 100%;
        //   margin: 4px;
        // }
      }
      .sendButton {
        display: flex;
        justify-content: center;
        align-items: center;
        margin-left: 0.5rem;
        padding: 0;
        width: 1.25rem;
        height: 1.25rem;
        background-color: transparent;
        border: 1px solid transparent;
        border-radius: 0.25rem;
        outline: none;
        cursor: pointer;

        .icon {
          width: 1.25rem;
          height: 1.25rem;
          color: var(--theme-content-dark-color);
          cursor: pointer;

          &:hover {
            color: var(--theme-caption-color);
          }
        }
        &:focus {
          border: 1px solid var(--primary-button-focused-border);
          box-shadow: 0 0 0 3px var(--primary-button-outline);

          & > .icon {
            color: var(--theme-caption-color);
          }
        }
      }
    }
    .buttons {
      display: flex;
      margin: 0.625rem 0 0 0.5rem;
    }

    .tool {
      display: flex;
      justify-content: center;
      align-items: center;
      width: 1.25rem;
      height: 1.25rem;
      color: var(--theme-content-dark-color);
      cursor: pointer;

      // &.active {
      //   color: var(--theme-caption-color);
      // }

      &:hover {
        color: var(--theme-caption-color);
      }
    }
    .tool + .tool {
      margin-left: 1rem;
    }
  }
</style>
