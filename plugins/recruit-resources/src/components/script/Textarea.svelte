<!--
//
// Copyright © 2024 Hardcore Engineering Inc.
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
//
-->

<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte'

  export let value: string
  export let disabled: boolean
  export let placeholder: string

  const dispatch = createEventDispatcher<{ change: string }>()

  let input: HTMLTextAreaElement

  function onInput (): void {
    input.style.height = 'auto'
    input.style.height = `${input.scrollHeight}px`
  }

  onMount(() => {
    setTimeout(() => {
      onInput()
    }, 0)
  })

  export function focus (): void {
    input.focus()
  }
</script>

<textarea
  bind:this={input}
  {placeholder}
  {disabled}
  {value}
  rows="1"
  on:input={onInput}
  on:blur={() => {
    if (input.value !== value) {
      dispatch('change', input.value)
    }
  }}
/>

<style lang="scss">
  textarea {
    appearance: none;
    background-color: transparent;
    border: none;
    color: var(--theme-caption-color);
    font: inherit;
    outline: none;
    padding: 0;
    resize: none;
    width: 100%;

    &::placeholder {
      color: var(--theme-halfcontent-color);
    }
    &:focus::placeholder {
      color: var(--theme-trans-color);
    }
  }
</style>
