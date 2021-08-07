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
import Typography from '@tiptap/extension-typography'
import Placeholder from '@tiptap/extension-placeholder'
import Mention from '@tiptap/extension-mention'

import MentionList from './MentionList.svelte'
import { SvelteRenderer } from './SvelteRenderer'

import { getClient } from '@anticrm/presentation'

import contact from '@anticrm/contact'

let element: HTMLElement
let editor: Editor

const dispatch = createEventDispatcher()
const client = getClient()

const HandleEnter = Extension.create({
  addKeyboardShortcuts() {
    return {
      'Enter': () => {
        dispatch('message', this.editor.getHTML())
        this.editor.commands.clearContent(false)
        return true
      }
      
      
    }
  },
})

onMount(() => {
  editor = new Editor({
    element,
    extensions: [
      HandleEnter,
      StarterKit,
      Highlight,
      Typography,
      Placeholder.configure({placeholder: 'Type something...'}),
      Mention.configure({
        HTMLAttributes: {
          class: 'mention',
        },
        suggestion: {
          items: async query => {
            const persons = await client.findAll(contact.class.Person, {})
            return persons.filter(person => person.firstName.includes(query))
          },
          render: () => {
            let component: any

            return {
              onStart: props => {
                component = new SvelteRenderer(MentionList, props)
              },
              onUpdate(props) {
                component.updateProps(props)
              },
              onKeyDown(props) {
                return component.onKeyDown(props)
              },
              onExit() {
                component.destroy()
              },
            }
          },
        },
      }),
    ],
    // content: 'dfgdfg',
    onTransaction: () => {
      // force re-render so `editor.isActive` works as expected
      editor = editor
    },
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

}

</style>