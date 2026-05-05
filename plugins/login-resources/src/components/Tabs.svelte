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

  import login from '../plugin'
  import { getHref } from '../utils'

  export let loginState: 'login' | 'signup' | 'none' = 'none'
  export let signUpDisabled = false
</script>

<div class="flex-row-center caption">
  {#if !signUpDisabled}
    <NavLink
      class="title"
      class:selected={loginState === 'signup'}
      href={getHref('signup')}
    >
      <Label label={login.string.SignUp} />
    </NavLink>
  {/if}
  <NavLink
    class="title"
    class:selected={loginState === 'login'}
    href={getHref('login')}
  >
    <Label label={login.string.LogIn} />
  </NavLink>
</div>

<style>
  .title {
    font-weight: 500;
    font-size: 1.25rem;
    color: var(--theme-caption-color);
  }
  .caption a {
    padding-bottom: 0.375rem;
    border-bottom: 2px solid var(--theme-caption-color);

    &:not(.selected) {
      color: var(--theme-dark-color);
      border-bottom-color: transparent;

      &:hover {
        color: var(--theme-caption-color);
      }
    }
    &.selected {
      cursor: default;
    }
    &:first-child {
      margin-right: 1.75rem;
    }
    &:hover {
      text-decoration: none;
    }
  }
</style>
