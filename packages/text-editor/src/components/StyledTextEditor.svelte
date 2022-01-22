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
  import { ScrollBox } from '@anticrm/ui'
  import { createEventDispatcher } from 'svelte'
  import Emoji from './icons/Emoji.svelte'
  import GIF from './icons/GIF.svelte'
  import TextStyle from './icons/TextStyle.svelte'
  import TextEditor from './TextEditor.svelte'

  const dispatch = createEventDispatcher()

  export let content: string = ''

  let textEditor: TextEditor

  export function submit (): void {
    textEditor.submit()
  }
</script>

<div class="ref-container">
  <div class="textInput">
    <div class="inputMsg">
      <ScrollBox bothScroll stretch>
        <TextEditor
          bind:content
          bind:this={textEditor}
          on:value
          on:content={(ev) => {
            dispatch('message', ev.detail)
            content = ''
            textEditor.clear()
          }}
          supportSubmit={false}
        />
      </ScrollBox>
    </div>
  </div>
  <div class="buttons">
    <div class="tool"><TextStyle size={'large'} /></div>
    <div class="tool"><Emoji size={'large'}/></div>
    <div class="tool"><GIF size={'large'}/></div>
    <div class="flex-grow">
      <slot />
    </div>
  </div>
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
        color: var(--theme-content-color);
        background-color: transparent;

        :global(.ProseMirror) {
          min-height: 0;
          max-height: 100%;
          height: 100%;
        }
      }
    }
    .buttons {
      margin: 10px 0 0 8px;
      display: flex;
      align-items: center;

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
