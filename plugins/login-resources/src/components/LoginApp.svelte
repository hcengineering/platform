<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021, 2022 Hardcore Engineering Inc.
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
  import { location, Popup, ticker } from '@hcengineering/ui'

  import LoginForm from './LoginForm.svelte'
  import SignupForm from './SignupForm.svelte'
  import CreateWorkspaceForm from './CreateWorkspaceForm.svelte'
  import SelectWorkspace from './SelectWorkspace.svelte'
  import Join from './Join.svelte'
  import { onDestroy } from 'svelte'
  import login from '../plugin'
  import { getMetadata } from '@hcengineering/platform'

  export let page: string = 'login'

  let navigateUrl: string | undefined

  function getToken (timer: number): string | undefined {
    return getMetadata(login.metadata.LoginToken)
  }
  $: token = getToken($ticker)

  onDestroy(
    location.subscribe(async (loc) => {
      page = loc.path[1] ?? (token ? 'selectWorkspace' : 'login')

      navigateUrl = loc.query?.navigateUrl ?? undefined
    })
  )
</script>

<div class="container">
  <div class="panel">
    {#if page === 'login'}
      <LoginForm {navigateUrl} />
    {:else if page === 'signup'}
      <SignupForm />
    {:else if page === 'createWorkspace'}
      <CreateWorkspaceForm />
    {:else if page === 'selectWorkspace'}
      <SelectWorkspace {navigateUrl} />
    {:else if page === 'join'}
      <Join />
    {/if}
  </div>
  <div class="intro">
    <div class="content">
      <div class="logo" />
    </div>
    <div class="slogan">
      <p>A unique place to manage all of your work</p>
      <p>Welcome to the Platform</p>
    </div>
  </div>
  <Popup />
</div>

<style lang="scss">
  .container {
    display: flex;
    flex-direction: row;
    height: 100%;
    padding: 0px 1.25rem 1.25rem 1.25rem;

    .panel {
      margin-right: 1.25rem;
      width: 41.75rem;
      height: 100%;
      border-radius: 1.25rem;
      background-color: var(--theme-menu-selection);
    }

    .intro {
      display: flex;
      flex-direction: column;
      flex-grow: 1;
      overflow: hidden;
      min-width: 20rem;

      .content {
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        flex-grow: 1;
        .logo {
          position: relative;
          &:after {
            position: absolute;
            content: '';
            background: center url('../../img/logo.svg');
            transform: translate(-50%, -50%);
            width: 63px;
            height: 79px;
          }
          &:before {
            position: absolute;
            content: '';
            transform: translate(-50%, -50%);
            width: 16rem;
            height: 16rem;
            border: 1.8px solid var(--theme-caption-color);
            border-radius: 50%;
            opacity: 0.08;
          }
        }
      }
      .slogan {
        margin-bottom: 60px;
        p {
          margin: 0;
          font-weight: 400;
          font-size: 0.8rem;
          text-align: center;
          color: var(--theme-caption-color);
          opacity: 0.8;
        }
      }
    }
  }
</style>
