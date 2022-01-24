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
  import { AnySvelteComponent, Icon } from '@anticrm/ui'
  import { AnyExtension } from '@tiptap/core'
  import { createEventDispatcher } from 'svelte'
  import { Completion } from '../Completion'
  import textEditorPlugin from '../plugin'
  import { RefInputAction, RefInputActionItem, TextEditorHandler } from '../types'
  import Attach from './icons/Attach.svelte'
  import Emoji from './icons/Emoji.svelte'
  import GIF from './icons/GIF.svelte'
  import Send from './icons/Send.svelte'
  import TextStyle from './icons/TextStyle.svelte'
  import MentionList from './MentionList.svelte'
  import { SvelteRenderer } from './SvelteRenderer'
  import TextEditor from './TextEditor.svelte'

  const dispatch = createEventDispatcher()
  export let content: string = ''
  export let showSend = true
  const client = getClient()

  let textEditor: TextEditor

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
      action: () => {},
      order: 1000
    },
    {
      label: textEditorPlugin.string.TextStyle,
      icon: TextStyle,
      action: () => {},
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
            return (await f(client, query.query))
          }
          return []
        },
        render: () => {
          let component: any

          return {
            onStart: (props:any) => {
              component = new SvelteRenderer(MentionList, {
                ...props,
                close: () => { component.destroy() },
                categories,
                category,
                onCategory: (cat: ObjectSearchCategory) => {
                  category = cat
                }
              })
            },
            onUpdate (props:any) {
              component.updateProps(props)
            },
            onKeyDown (props:any) {
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
  <div class="textInput">
    <div class="inputMsg">
      <TextEditor bind:content={content} bind:this={textEditor} on:content={
        ev => {
          dispatch('message', ev.detail)
          content = ''
          textEditor.clear()
        }
      } extensions={editorExtensions} />
    </div>
    {#if showSend}
      <button class="sendButton" on:click={submit}><div class="icon"><Send/></div></button>
    {/if}
  </div>
  <div class="buttons">
    {#each actions as a}
      <div class="tool" on:click={(evt) => handleAction(a, evt)}>
        <Icon icon={a.icon}  size={'large'}/>
      </div>
    {/each}
  </div>
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
      padding: .75rem 1rem;
      background-color: var(--theme-bg-accent-color);
      border: 1px solid var(--theme-bg-accent-color);
      border-radius: .75rem;

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
        margin-left: 8px;
        padding: 0;
        width: 20px;
        height: 20px;
        background-color: transparent;
        border: 1px solid transparent;
        border-radius: .25rem;
        outline: none;
        cursor: pointer;

        .icon {
          width: 20px;
          height: 20px;
          opacity: 0.3;
          cursor: pointer;
          &:hover {
            opacity: 1;
          }
        }
        &:focus {
          border: 1px solid var(--primary-button-focused-border);
          box-shadow: 0 0 0 3px var(--primary-button-outline);
          & > .icon {
            opacity: 1;
          }
        }
      }
    }
    .buttons {
      margin: 10px 0 0 8px;
      display: flex;

      .tool {
        display: flex;
        justify-content: center;
        align-items: center;
        width: 20px;
        height: 20px;
        opacity: 0.3;
        cursor: pointer;
        &:hover {
          opacity: 1;
        }
      }
      .tool + .tool {
        margin-left: 16px;
      }
    }
  }
</style>
