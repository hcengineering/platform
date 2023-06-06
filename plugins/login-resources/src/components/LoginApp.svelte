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
  import { Popup, Scroller, deviceOptionsStore as deviceInfo, location, ticker } from '@hcengineering/ui'

  import { getMetadata } from '@hcengineering/platform'
  import presentation from '@hcengineering/presentation'
  import { themeStore } from '@hcengineering/theme'
  import { onDestroy } from 'svelte'
  import Confirmation from './Confirmation.svelte'
  import ConfirmationSend from './ConfirmationSend.svelte'
  import CreateWorkspaceForm from './CreateWorkspaceForm.svelte'
  import Join from './Join.svelte'
  import LoginForm from './LoginForm.svelte'
  import PasswordRequest from './PasswordRequest.svelte'
  import PasswordRestore from './PasswordRestore.svelte'
  import SelectWorkspace from './SelectWorkspace.svelte'
  import SignupForm from './SignupForm.svelte'
  import LoginIcon from './icons/LoginIcon.svelte'
  import workbench from '@hcengineering/workbench'

  import loginBack from '../../img/login_back.png'
  import loginBack2x from '../../img/login_back_2x.png'

  import loginBackAvif from '../../img/login_back.avif'
  import loginBack2xAvif from '../../img/login_back_2x.avif'

  import loginBackWebp from '../../img/login_back.webp'
  import loginBack2xWebp from '../../img/login_back_2x.webp'

  export let page: string = 'login'

  let navigateUrl: string | undefined

  function getToken(timer: number): string | undefined {
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

<div class="theme-dark w-full h-full backd" class:paneld={$deviceInfo.docWidth <= 768} class:white={!$themeStore.dark}>
  <picture>
    <source srcset={`${loginBackAvif}, ${loginBack2xAvif} 2x`} type="image/avif" />
    <source srcset={`${loginBackWebp}, ${loginBack2xWebp} 2x`} type="image/webp" />

    <img
      style:position="fixed"
      style:top={'32px'}
      style:right={'0px'}
      style:bottom={'0px'}
      src={loginBack}
      style:height={'100%'}
      srcset={`${loginBack} 1x, ${loginBack2x} 2x`}
      alt=""
    />
  </picture>
  <div style:position="fixed" style:left={'28px'} style:top={'48px'} class="flex-row-center">
    <LoginIcon /><span class="fs-title">{getMetadata(workbench.metadata.PlatformTitle)}</span>
  </div>
  <div class="fixed" style:top={'48px'} style:right={'48px'} style:bottom={'48px'} style:height={'100%'}>
    <Scroller padding={'1.25rem'} contentDirection={$deviceInfo.docWidth <= 768 ? 'vertical-reverse' : 'horizontal'}>
      <div class="flex-grow" />
      <div
        class:mt-8={$deviceInfo.docWidth < 768}
        class:panel={$deviceInfo.docWidth > 768}
        class:white={!$themeStore.dark}
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
        {:else if page === 'confirm'}
          <Confirmation />
        {:else if page === 'confirmationSend'}
          <ConfirmationSend />
        {/if}
      </div>
    </Scroller>
    <Popup />
  </div>
</div>

<style lang="scss">
  .backd {
    background-color: 'rgb(0,0,0)';

    &.paneld {
      background: linear-gradient(180deg, #232324 0%, #171719 100%);
    }
  }

  .panel {
    position: relative;
    display: flex;
    flex-direction: column;
    height: calc(100% - 5rem);
    background: linear-gradient(180deg, #232324 0%, #171719 100%);

    &.white {
      background: radial-gradient(94.31% 94.31% at 6.36% 5.69%, #484a4f 0%, #505257 100%);
    }
    border-radius: 7.5658px !important;
    box-shadow: 30px 11.52px 193.87px rgba(0, 0, 0, 0.7);

    &.minHeight {
      min-height: 40rem;
    }

    &::before,
    &::after {
      content: '';
      position: absolute;
      border-radius: 50%;
      z-index: -1;
    }
    &.landscape {
      margin-right: 1.25rem;
      width: 41.75rem;
    }
  }
</style>
