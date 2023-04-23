<!--
// Copyright © 2022 Hardcore Engineering Inc.
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
  import type { Asset, IntlString } from '@hcengineering/platform'
  import { AnySvelteComponent, Icon, Label, SearchEdit } from '@hcengineering/ui'
  import { userSearch } from '../index'
  import { navigateToSpecial } from '../utils'

  export let icon: Asset | AnySvelteComponent | undefined = undefined
  export let label: string | undefined = undefined
  export let intlLabel: IntlString | undefined = undefined
  export let description: string | undefined = undefined

  let userSearch_: string
  userSearch.subscribe((v) => (userSearch_ = v))
</script>

<div class="ac-header__wrap-description">
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <div class="ac-header__wrap-title" on:click>
    {#if icon}<div class="ac-header__icon"><Icon {icon} size={'small'} /></div>{/if}
    {#if label}
      <span class="ac-header__title">{label}</span>
    {:else if intlLabel}
      <div class="ac-header__title">
        <Label label={intlLabel} />
      </div>
    {/if}
  </div>
  {#if description}<span class="ac-header__description">{description}</span>{/if}
</div>
<SearchEdit
  value={userSearch_}
  on:change={(ev) => {
    userSearch.set(ev.detail)

    if (ev.detail !== '') {
      navigateToSpecial('chunterBrowser')
    }
  }}
/>

<style lang="scss">
  .ac-header__wrap-title:hover {
    cursor: pointer;
    span {
      text-decoration: underline;
    }
  }
</style>
