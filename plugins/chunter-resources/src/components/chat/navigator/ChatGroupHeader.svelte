<!--
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
-->
<script lang="ts">
  import { IntlString } from '@hcengineering/platform'
  import { Action, IconMoreH, Label, Menu, showPopup } from '@hcengineering/ui'

  export let header: IntlString
  export let actions: Action[] = []

  async function handleMenuClicked (ev: MouseEvent) {
    showPopup(Menu, { actions }, ev.target as HTMLElement)
  }
</script>

<div class="root">
  <div class="header uppercase">
    <Label label={header} />
  </div>

  <div class="grower" />
  {#if actions.length > 0}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div class="action" on:click|preventDefault|stopPropagation={handleMenuClicked}>
      <IconMoreH size="small" />
    </div>
  {/if}
</div>

<style lang="scss">
  .root {
    display: flex;
    align-items: center;
    flex-shrink: 0;
    border-radius: 0.375rem;
    padding-right: 0.25rem;
  }

  .header {
    padding: 0.5rem;
    border-radius: 0.25rem;
    background-color: var(--global-ui-highlight-BackgroundColor);
    font-size: 0.75rem;
    width: fit-content;
    margin: 0.5rem 0;
  }

  .action {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.25rem;
    border-radius: 0.25rem;
    flex-shrink: 0;
    margin-left: 0.5rem;
    cursor: pointer;

    &:hover {
      color: var(--theme-caption-color);
      background-color: var(--global-ui-highlight-BackgroundColor);
    }
  }

  .grower {
    flex-grow: 1;
    min-width: 0;
  }
</style>
