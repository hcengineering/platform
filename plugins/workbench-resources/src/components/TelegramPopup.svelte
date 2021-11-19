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
  import { Label, IconClose, Button, EditBox } from '@anticrm/ui'
  import PinPad from './PinPad.svelte'

  export let checkState: boolean = false

  const dispatch = createEventDispatcher()
  const digitsCount: number = 6

  const changeState = (): void => {
    if (checkState) {

    } else {

    }
    checkState = !checkState
  }

  const checkInput = (result: CustomEvent) => {
    if (result) console.log('Telegram pin code filled', result.detail)
  }
</script>

<div class="plugin-popup">
  <div class="popup-bg" />
  <div class="flex-between header">
    <div class="overflow-label fs-title"><Label label={'Connect your Telegram account'} /></div>
    <div class="tool" on:click={() => { dispatch('close') }}>
      <IconClose size={'small'}/>
    </div>
  </div>
  <div class="content" class:more={!checkState}>
    {#if checkState}
      <p>Enter the {digitsCount}-digit code you received on your Telegram account.</p>
      <PinPad length={digitsCount} on:filled={checkInput} />
    {:else}
      <p>Enter your Telegram username or phone number to connect your account.</p>
      <EditBox label={'Username or phone number'} placeholder={'@johnappleseed'} />
    {/if}
  </div>
  <div class="footer">
    <Button label={checkState ? 'Connect' : 'Next'} primary on:click={changeState} />
    {#if checkState}
      <a class="link" href={'#'} on:click={changeState}>Back</a>
    {/if}
  </div>
</div>

<style lang="scss">
  .plugin-popup {
    position: relative;
    display: flex;
    flex-direction: column;
    width: 20rem;
    min-width: 20rem;
    max-width: 20rem;
    border-radius: 1.25rem;

    .header {
      flex-shrink: 0;
      margin: 1.75rem 1.75rem 1.25rem;
      .tool {
        cursor: pointer;
        &:hover { color: var(--theme-caption-color); }
        &:active { color: var(--theme-content-accent-color); }
      }
    }

    .content {
      flex-shrink: 0;
      flex-grow: 1;
      margin: 0 1.75rem .5rem;
      height: fit-content;
      p { margin: 0 0 1rem; }
      &.more { margin-bottom: 1rem; }
    }

    .footer {
      display: flex;
      flex-direction: row-reverse;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 1.75rem 1.75rem;

      .link {
        color: var(--theme-content-dark-color);
        &:hover { color: var(--theme-caption-color); }
        &:active { color: var(--theme-content-accent-color); }
      }
    }

    .popup-bg {
      position: absolute;
      top: 0;
      bottom: 0;
      left: 0;
      right: 0;
      background-color: var(--theme-card-bg);
      border-radius: 1.25rem;
      backdrop-filter: blur(15px);
      box-shadow: var(--theme-card-shadow);
      z-index: -1;
    }
  }
</style>
