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
  import { getResource } from '@anticrm/platform'
  import presentation, { getClient, ObjectSearchCategory } from '@anticrm/presentation'
  import { Icon } from '@anticrm/ui'
  import { AnyExtension } from '@tiptap/core'
  import { createEventDispatcher } from 'svelte'
  import {
    getDefaultAttachRefAction,
    getDefaultEmojiRefAction,
    getDefaultGIFRefAction,
    getDefaultTextStyleRefAction
  } from '../actions'
  import { Completion } from '../Completion'
  import textEditorPlugin from '../plugin'
  import { RefAction, RefInputActionItem, TextEditorHandler } from '../types'
  import Send from './icons/Send.svelte'
  import MentionList from './MentionList.svelte'
  import { SvelteRenderer } from './SvelteRenderer'
  import TextEditor from './TextEditor.svelte'

  const dispatch = createEventDispatcher()
  export let content: string = ''
  export let showSend = true
  export let withoutTopBorder = false
  export let actions: RefAction[] | undefined = undefined
  export let clearContent: boolean = true
  const client = getClient()

  let textEditor: TextEditor

  export let categories: ObjectSearchCategory[] = []

  client.findAll(presentation.class.ObjectSearchCategory, {}).then((r) => {
    categories = r
  })

  // Current selected category
  let category: ObjectSearchCategory | undefined = categories[0]

  if (actions === undefined) {
    const defaultActions: RefAction[] = [
      getDefaultAttachRefAction(() => dispatch('attach')),
      getDefaultTextStyleRefAction(),
      getDefaultEmojiRefAction(),
      getDefaultGIFRefAction()
    ]

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
      actions = defaultActions.concat(...cont).sort((a, b) => a.order - b.order)
    })
  }

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
    console.log('handle event', a.label)
    a.action(evt?.target as HTMLElement, editorHandler)
  }
</script>

<div class="ref-container">
  <div class="textInput" class:withoutTopBorder>
    <div class="inputMsg">
      <TextEditor
        bind:content
        bind:this={textEditor}
        on:content={(ev) => {
          dispatch('message', ev.detail)
          if (clearContent) {
            content = ''
            textEditor.clear()
          }
        }}
        extensions={editorExtensions}
      />
    </div>
    {#if showSend}
      <button class="sendButton" on:click={submit}
        ><div class="icon">
          <Send size={'medium'} />
        </div></button
      >
    {/if}
  </div>
  {#if actions}
    <div class="buttons">
      {#each actions as a}
        <div class="tool" on:click={(evt) => handleAction(a, evt)}>
          <Icon icon={a.icon} size={'large'} />
        </div>
      {/each}
    </div>
  {/if}
</div>

<style lang="scss">
  .ref-container {
    display: flex;
    flex-direction: column;
    min-height: 4.5rem;

    .textInput {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      min-height: 2.75rem;
      padding: 0.75rem 1rem;
      background-color: var(--theme-bg-accent-color);
      border: 1px solid var(--theme-bg-accent-color);
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

      .tool {
        display: flex;
        justify-content: center;
        align-items: center;
        width: 1.25rem;
        height: 1.25rem;
        color: var(--theme-content-dark-color);
        cursor: pointer;

        &:hover {
          color: var(--theme-caption-color);
        }
      }
      .tool + .tool {
        margin-left: 1rem;
      }
    }
  }
</style>
