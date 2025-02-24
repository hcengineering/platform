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
  import { Label } from '@hcengineering/ui'
  import { NavLink } from '@hcengineering/presentation'

  import { getHref } from '../utils'
  import { BottomAction, goTo } from '../index'

  export let action: BottomAction
</script>

<div>
  {#if action.caption}
    <span><Label label={action.caption} /></span>
  {/if}
  {#if action.page}
    <NavLink
      href={getHref(action.page)}
      onClick={() => {
        if (action.func !== undefined) {
          action.func()
        } else if (action.page !== undefined) {
          goTo(action.page)
        }
      }}><Label label={action.i18n} /></NavLink
    >
  {:else}
    <a href="." on:click|preventDefault={action.func}><Label label={action.i18n} /></a>
  {/if}
</div>

<style lang="scss">
  span {
    color: var(--theme-darker-color);
  }
  a {
    font-weight: 400;
    color: var(--theme-content-color);
  }
</style>
