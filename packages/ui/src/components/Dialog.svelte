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

<div class="container">
  <form class="dialog">
    <div class="header">
      <div class="title"><Label {label}/></div>
      <div class="tool" on:click={() => { dispatch('close') }}><Close size={'small'}/></div>
    </div>
    <div class="content">
      <ScrollBox vertical gap={0}><slot/></ScrollBox>
    </div>
    <div class="footer">
      <Button label={okLabel} primary on:click={() => { okAction(); dispatch('close') }}/>
      <Button label={'Cancel'} on:click={() => { okAction(); dispatch('close') }}/>
    </div>
  </form>
</div>

<style lang="scss">
  .container {
    position: relative;
    display: flex;
    justify-content: space-between;
    flex-direction: row-reverse;
    width: 100vw;
    max-height: 100vh;
    height: 100vh;

    .dialog {
      display: flex;
      flex-direction: column;
      min-width: 40%;
      max-width: 80%;
      width: auto;
      max-height: 100vh;
      height: 100vh;
      background-color: var(--theme-bg-color);
      border-radius: 30px 0 0 30px;
      box-shadow: 0px 50px 120px rgba(0, 0, 0, 0.4);

      .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-shrink: 0;
        padding: 0 32px 0 40px;
        height: 72px;

        .title {
          flex-grow: 1;
          font-weight: 500;
          font-size: 18px;
          color: var(--theme-caption-color);
          user-select: none;
        }

        .tool {
          width: 16px;
          height: 16px;
          margin-left: 12px;
          opacity: .4;
          cursor: pointer;
          &:hover {
            opacity: 1;
          }
        }
      }

      .content {
        flex-shrink: 0;
        width: 640px;
        margin: 0 40px;
        height: calc(100vh - 168px);
      }

      .footer {
        display: flex;
        overflow: hidden;
        flex-direction: row-reverse;
        align-items: center;
        flex-shrink: 0;
        gap: 12px;
        padding: 0 40px;
        height: 96px;
        mask-image: linear-gradient(90deg, rgba(0, 0, 0, 0) 20px, rgba(0, 0, 0, 1) 40px);
      }
    }
  }
</style>