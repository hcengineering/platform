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
  import { onMount } from 'svelte'
  import { createEventDispatcher } from 'svelte'
  import { IconInfo } from '@hcengineering/ui'

  export let length: number = 6
  export let value: string = ''
  export let error: string | undefined = undefined

  const dispatch = createEventDispatcher()

  let digits: string[] = []
  const areas: HTMLInputElement[] = []
  let selected: number = 0
  let filled: number

  for (let i = 0; i < length; i++) digits[i] = ''

  const onInput = (ev?: Event, n?: number): void => {
    error = undefined
    selected = -1
    filled = 0
    value = ''
    for (let i = 0; i < length; i++) {
      if (digits[i] && digits[i].length > 1) {
        if (i < length - 1) digits[i + 1] = digits[i].substring(1)
        digits[i] = digits[i][0]
      }
      if (digits[i]) filled++
      if (selected < 0 && selected < length && digits[i] === '') selected = i
      value += digits[i]
    }
    digits = digits
    if (filled === length) {
      if ((ev as InputEvent).inputType === 'insertFromPaste' && n && n < length) selected = n
      if ((ev as InputEvent).inputType === 'insertText' && selected < 0 && (n || n === 0)) selected = n + 1
      if (selected === length) selected--
      dispatch('filled', value)
    }
    if (selected !== -1 && selected < length) {
      areas[selected].focus()
      areas[selected].select()
    }
  }

  const selectInput = (n: number): void => {
    if (areas[n]) {
      areas[n].focus()
      areas[n].select()
    }
  }

  const keyPressed = (ev: Event, n: number): void => {
    if ((ev as KeyboardEvent).key === 'Backspace' && n > 0 && digits[n] === '') {
      digits[n - 1] = ''
      digits = digits
      onInput(undefined, n - 1)
    }
  }

  onMount(() => {
    if (areas[0]) onInput()
  })
</script>

<div class="flex-between">
  {#each digits as digit, i}
    <input
      class="fs-title digit"
      class:error
      type="text"
      bind:this={areas[i]}
      bind:value={digit}
      on:input={(ev) => {
        onInput(ev, i)
      }}
      on:keydown={async (ev) => keyPressed(ev, i)}
      on:click={async () => selectInput(i)}
    />
  {/each}
</div>
{#if error}
  <div class="error-message flex-row-center">
    <IconInfo size={'small'} />
    <div>{error}</div>
  </div>
{/if}

<style lang="scss">
  .digit {
    width: 2.5rem;
    height: 3rem;
    text-align: center;
    background-color: var(--popup-bg-hover);
    border: 1px solid transparent;
    border-style: none;
    border-radius: 0.5rem;

    &.error {
      border: 1.2px solid var(--system-error-color);
      background-color: #faa9981a;
    }

    &:focus {
      box-shadow: 0 0 0 2px var(--accented-button-outline);
    }
  }

  .error-message {
    margin-top: 0.5rem;
    margin-left: 0.2rem;
    color: var(--system-error-color);

    div {
      margin-left: 0.3rem;
    }
  }
</style>
