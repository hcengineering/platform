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
  import { location, Popup, ticker, Scroller, deviceOptionsStore as deviceInfo } from '@hcengineering/ui'

  import LoginForm from './LoginForm.svelte'
  import SignupForm from './SignupForm.svelte'
  import CreateWorkspaceForm from './CreateWorkspaceForm.svelte'
  import SelectWorkspace from './SelectWorkspace.svelte'
  import Join from './Join.svelte'
  import Intro from './Intro.svelte'
  import { onDestroy } from 'svelte'
  import presentation from '@hcengineering/presentation'
  import { getMetadata } from '@hcengineering/platform'
  import PasswordRequest from './PasswordRequest.svelte'
  import PasswordRestore from './PasswordRestore.svelte'

  export let page: string = 'login'

  let navigateUrl: string | undefined

  function getToken (timer: number): string | undefined {
    return getMetadata(presentation.metadata.Token)
  }
  $: token = getToken($ticker)

  onDestroy(
    location.subscribe(async (loc) => {
      page = loc.path[1] ?? (token ? 'selectWorkspace' : 'login')

      navigateUrl = loc.query?.navigateUrl ?? undefined
    })
  )
</script>

<Scroller padding={'1.25rem'} contentDirection={$deviceInfo.docWidth <= 768 ? 'vertical-reverse' : 'horizontal'}>
  <div
    class="panel"
    class:minHeight={!$deviceInfo.isPortrait}
    class:landscape={$deviceInfo.docWidth > 768}
    style:border-radius={$deviceInfo.docWidth <= 480 ? '.75rem' : '1.25rem'}
  >
    <div class="flex-grow" />
    {#if page === 'login'}
      <LoginForm {navigateUrl} />
    {:else if page === 'signup'}
      <SignupForm />
    {:else if page === 'createWorkspace'}
      <CreateWorkspaceForm />
    {:else if page === 'password'}
      <PasswordRequest />
    {:else if page === 'recovery'}
      <PasswordRestore />
    {:else if page === 'selectWorkspace'}
      <SelectWorkspace {navigateUrl} />
    {:else if page === 'join'}
      <Join />
    {/if}
  </div>
  <Intro landscape={$deviceInfo.docWidth <= 768} mini={$deviceInfo.docWidth <= 480} />
</Scroller>
<Popup />

<style lang="scss">
  .panel {
    position: relative;
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--theme-list-row-color);
    box-shadow: var(--popup-aside-shadow);

    &.minHeight {
      min-height: 40rem;
    }

    $circle-size: calc(1vh + 1vw);
    $r1: 23;
    $r2: 17;
    &::before,
    &::after {
      content: '';
      position: absolute;
      border-radius: 50%;
      z-index: -1;
    }
    &::before {
      top: calc(-1 * $circle-size * $r1 / 2 + $circle-size * 5);
      left: auto;
      right: calc(-1 * $circle-size * $r1 / 2);
      width: calc($circle-size * $r1);
      height: calc($circle-size * $r1);
      border: 1px solid var(--content-color);
      opacity: 0.05;
    }
    &::after {
      top: calc(-1 * $circle-size * $r2 / 2 + $circle-size * 5);
      left: auto;
      right: calc(-1 * $circle-size * $r2 / 2);
      width: calc($circle-size * $r2);
      height: calc($circle-size * $r2);
      background: var(--dark-color);
      border: 1px solid var(--caption-color);
      opacity: 0.05;
    }
    &.landscape {
      margin-right: 1.25rem;
      width: 41.75rem;
      &::before {
        left: calc(-1 * $circle-size * $r1 / 2);
        right: auto;
      }
      &::after {
        left: calc(-1 * $circle-size * $r2 / 2);
        right: auto;
      }
    }
  }
</style>
