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
  import type { IntlString } from '@anticrm/platform'

  import { createEventDispatcher } from 'svelte'

  import Close from './internal/icons/Close.svelte'
  import ScrollBox from './ScrollBox.svelte'
  import Button from './Button.svelte'
  import Label from './Label.svelte'

  export let label: IntlString
  export let okLabel: IntlString
  export let okAction: () => void

  const dispatch = createEventDispatcher()
</script>

<div class="dialog-container">
  <form class="dialog" on:submit|preventDefault={() => { okAction(); dispatch('close') }}>
    <div class="flex-between header">
      <div class="title"><Label {label}/></div>
      <div class="tool" on:click={() => { dispatch('close') }}><Close size={'small'}/></div>
    </div>
    <div class="content">
      <ScrollBox vertical stretch><slot/></ScrollBox>
    </div>
    <div class="footer">
      <Button label={okLabel} primary/>
      <Button label={'Cancel'} on:click={() => { dispatch('close') }}/>
    </div>
  </form>
</div>

<style lang="scss">
  .dialog-container {
    position: relative;
    display: flex;
    justify-content: space-between;
    flex-direction: row-reverse;
    width: 100vw;
    min-height: 100vh;
    max-height: 100vh;

    .dialog {
      display: flex;
      flex-direction: column;
      width: auto;
      min-height: 100vh;
      max-height: 100vh;
      background-color: var(--theme-bg-color);
      border-radius: 1.875rem 0 0 1.875rem;
      box-shadow: 0px 3.125rem 7.5rem rgba(0, 0, 0, .4);

      .header {
        flex-shrink: 0;
        padding: 0 2rem 0 2.5rem;
        height: 4.5rem;

        .title {
          flex-grow: 1;
          font-weight: 500;
          font-size: 1.125rem;
          color: var(--theme-caption-color);
          user-select: none;
        }

        .tool {
          margin-left: .75rem;
          opacity: .4;
          cursor: pointer;
          &:hover { opacity: 1; }
        }
      }

      .content {
        flex-shrink: 0;
        flex-grow: 1;
        width: 40rem;
        margin: 0 2.5rem;
        height: fit-content;
      }

      .footer {
        display: flex;
        overflow: hidden;
        flex-direction: row-reverse;
        align-items: center;
        flex-shrink: 0;
        gap: .75rem;
        padding: 0 2.5rem;
        height: 6rem;
        mask-image: linear-gradient(90deg, rgba(0, 0, 0, 0) 1.25rem, rgba(0, 0, 0, 1) 2.5rem);
      }
    }
  }
</style>