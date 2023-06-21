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
  import { themeStore } from '@hcengineering/ui'
  import workbench from '@hcengineering/workbench'
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

  import loginBack from '../../img/login_back.png'
  import loginBack2x from '../../img/login_back_2x.png'

  import loginBackAvif from '../../img/login_back.avif'
  import loginBack2xAvif from '../../img/login_back_2x.avif'

  import loginBackWebp from '../../img/login_back.webp'
  import loginBack2xWebp from '../../img/login_back_2x.webp'

  export let page: string = 'login'

  let navigateUrl: string | undefined

  function getToken (timer: number): string | undefined {
    return getMetadata(presentation.metadata.Token)
  }
  $: token = getToken($ticker)

  const pages = [
    'login',
    'signup',
    'createWorkspace',
    'password',
    'recovery',
    'selectWorkspace',
    'join',
    'confirm',
    'confirmationSend'
  ]
  onDestroy(
    location.subscribe(async (loc) => {
      page = loc.path[1] ?? (token ? 'selectWorkspace' : 'login')
      if (!pages.includes(page)) {
        page = 'login'
      }

      navigateUrl = loc.query?.navigateUrl ?? undefined
    })
  )
</script>

<div class="theme-dark w-full h-full backd" class:paneld={$deviceInfo.docWidth <= 768} class:white={!$themeStore.dark}>
  <div class="bg-image clear-mins" class:back={$deviceInfo.docWidth > 768} class:p-4={$deviceInfo.docWidth > 768}>
    <picture>
      <source srcset={`${loginBackAvif}, ${loginBack2xAvif} 2x`} type="image/avif" />
      <source srcset={`${loginBackWebp}, ${loginBack2xWebp} 2x`} type="image/webp" />

      <img
        class="back-image"
        src={loginBack}
        style:display={$deviceInfo.docWidth <= 768 ? 'none' : 'block'}
        srcset={`${loginBack} 1x, ${loginBack2x} 2x`}
        alt=""
      />
    </picture>

    <div
      style:position="fixed"
      style:left={$deviceInfo.docWidth <= 480 ? '.75rem' : '1.75rem'}
      style:top={'3rem'}
      class="flex-row-center"
    >
      <LoginIcon /><span class="fs-title">{getMetadata(workbench.metadata.PlatformTitle)}</span>
    </div>

    <div class="panel-base" class:panel={$deviceInfo.docWidth > 768} class:white={!$themeStore.dark}>
      <Scroller padding={'1rem 0'}>
        <div class="form-content">
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
    </div>

    <Popup />
  </div>
</div>

<style lang="scss">
  .back-image {
    position: fixed;
    top: 32px;
    left: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: left top;
  }
  .backd {
    position: relative;
    background-color: var(--theme-bg-color);

    .bg-image {
      display: flex;
      flex-direction: row-reverse;
      width: 100%;
      height: 100%;
    }
    &.paneld {
      background: rgba(45, 50, 160, 0.5);

      .panel-base {
        padding-top: 5rem;
        padding-bottom: 1rem;
        width: 100%;
      }
    }
  }

  .panel {
    position: relative;
    display: flex;
    flex-direction: column;
    justify-content: center;
    width: 50%;
    height: 100%;
    min-width: 35rem;
    max-width: 41rem;
    background: rgba(45, 50, 160, 0.5);
    mix-blend-mode: normal;
    box-shadow: -30px 1.52px 173.87px #121437;
    backdrop-filter: blur(157.855px);
    border-radius: 1rem;

    &::after {
      overflow: hidden;
      position: absolute;
      content: '';
      inset: 0;
      background: radial-gradient(161.92% 96.11% at 11.33% 3.89%, #313d9a 0%, #202669 100%);
      border-radius: 1rem;
      z-index: -1;
    }
    &::before {
      position: absolute;
      content: '';
      inset: 0;
      padding: 1px;
      background: conic-gradient(
          rgba(255, 255, 255, 0.18) 10%,
          rgba(126, 120, 165, 0.5),
          rgba(191, 216, 253, 0.5),
          rgba(246, 247, 249, 0.32),
          rgba(219, 229, 242, 0.34) 60%,
          rgba(163, 203, 255, 0.24) 90%
        )
        border-box;
      -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
      -webkit-mask-composite: xor;
      mask-composite: exclude;
      border-radius: 1rem;
      transform: rotate(180deg);
      transition: opacity 0.15s var(--timing-main);
      opacity: 0.7;
    }
  }
  .backd.paneld::after,
  .panel::after {
    overflow: hidden;
    position: absolute;
    content: '';
    inset: 0;
    background: radial-gradient(161.92% 96.11% at 11.33% 3.89%, #313d9a 0%, #202669 100%);
    z-index: -1;
  }
  .panel::after {
    border-radius: 1rem;
  }
  .form-content {
    display: flex;
    flex-direction: column;
    justify-content: center;
    flex-grow: 1;
    height: max-content;
  }
</style>
