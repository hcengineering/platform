<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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

import { onMount, onDestroy, createEventDispatcher } from 'svelte'
import { Editor, Extension } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Highlight from '@tiptap/extension-highlight'
import Link from '@tiptap/extension-link'
// import Typography from '@tiptap/extension-typography'
import Placeholder from '@tiptap/extension-placeholder'
// import Mention from '@tiptap/extension-mention'
import { Completion } from '../Completion'

import MentionList from './MentionList.svelte'
import { SvelteRenderer } from './SvelteRenderer'

import { getClient } from '@anticrm/presentation'

import contact from '@anticrm/contact'

export let content: string = ''
export let placeholder: string = 'Type something...'

let element: HTMLElement
let editor: Editor

const dispatch = createEventDispatcher()
const client = getClient()

export function submit (): void {
  content = editor.getHTML()
  dispatch('content', content)
}

export function clear (): void {
  content = ''
  editor.commands.clearContent(false)
}

const Handle = Extension.create({
  addKeyboardShortcuts () {
    return {
      'Shift-Enter': () => {
        const res = this.editor.commands.splitListItem('listItem')
        if (!res) {
          this.editor.commands.first(({ commands }) => [
            () => commands.newlineInCode(),
            () => commands.createParagraphNear(),
            () => commands.liftEmptyBlock(),
            () => commands.splitBlock()
          ])
        }
        return true
      },
      Enter: () => {
        submit()
        return true
      }
    }
  }
})

onMount(() => {
  editor = new Editor({
    element,
    content: content,
    extensions: [
      StarterKit,
      Highlight,
      Link,
      Handle, // order important
      // Typography, // we need to disable 1/2 -> ½ rule (https://github.com/hcengineering/anticrm/issues/345)
      Placeholder.configure({ placeholder: placeholder }),
      Completion.configure({
        HTMLAttributes: {
          class: 'reference'
        },
        suggestion: {
          items: async (query: { query: string }) => {
            const persons = await client.findAll(contact.class.Person, { name: { $like: `%${query.query}%` } }, { limit: 200 })
            return persons.filter(person => person.name.includes(query.query))
          },
          render: () => {
            let component: any

            return {
              onStart: (props:any) => {
                component = new SvelteRenderer(MentionList, { ...props, close: () => { component.destroy() } })
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
    ],
    onTransaction: () => {
      // force re-render so `editor.isActive` works as expected
      editor = editor
    },
    onBlur: () => {
      dispatch('blur')
    }
  })
})

onDestroy(() => {
  if (editor) {
    editor.destroy()
  }
})
</script>

<div style="width: 100%" bind:this={element}/>

<style lang="scss" global>

.ProseMirror {
  overflow-y: auto;
  max-height: 5.5rem;
  outline: none;

  p {
    margin: 0;
  }

  > * + * {
    margin-top: 0.75em;
  }

  /* Placeholder (at the top) */
  p.is-editor-empty:first-child::before {
    content: attr(data-placeholder);
    float: left;
    color: var(--theme-content-trans-color);
    pointer-events: none;
    height: 0;
  }

  &::-webkit-scrollbar-thumb { background-color: var(--theme-bg-accent-hover); }
  &::-webkit-scrollbar-corner { background-color: var(--theme-bg-accent-hover); }
  &::-webkit-scrollbar-track { margin: 0; }
}

</style>