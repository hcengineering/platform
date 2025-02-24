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
  import login from '@hcengineering/login'
  import { getAccount } from '@hcengineering/login-resources'
  import { getMetadata, setMetadata } from '@hcengineering/platform'
  import presentation from '@hcengineering/presentation'
  import {
    Location,
    Popup,
    Scroller,
    deviceOptionsStore as deviceInfo,
    fetchMetadataLocalStorage,
    getCurrentLocation,
    location,
    setMetadataLocalStorage,
    themeStore
  } from '@hcengineering/ui'
  import workbench from '@hcengineering/workbench'
  import { onDestroy, onMount } from 'svelte'

  import Auth from './Auth.svelte'
  import LoginIcon from './icons/OnboardIcon.svelte'
  import OnboardForm from './OnboardForm.svelte'

  import loginBack from '../../img/login_back.png'
  import loginBack2x from '../../img/login_back_2x.png'

  import loginBackAvif from '../../img/login_back.avif'
  import loginBack2xAvif from '../../img/login_back_2x.avif'

  import loginBackWebp from '../../img/login_back.webp'
  import loginBack2xWebp from '../../img/login_back_2x.webp'

  import { Pages, pages } from '..'

  export let page: Pages = 'onboard'

  onDestroy(location.subscribe(updatePageLoc))

  function updatePageLoc (loc: Location): void {
    const token = getMetadata(presentation.metadata.Token)
    page = (loc.path[1] as Pages) ?? (token != null ? 'selectWorkspace' : 'login')
    const allowedUnauthPages: Pages[] = ['onboard', 'auth']
    if (token === undefined ? !allowedUnauthPages.includes(page) : !pages.includes(page)) {
      page = 'onboard'
    }
  }

  async function chooseToken (): Promise<void> {
    if (page === 'auth') {
      // token handled by auth page
      return
    }
    if (getMetadata(presentation.metadata.Token) == null) {
      const lastToken = fetchMetadataLocalStorage(login.metadata.LastToken)
      if (lastToken != null) {
        try {
          const info = await getAccount(false)
          if (info !== undefined) {
            setMetadata(presentation.metadata.Token, info.token)
            setMetadataLocalStorage(login.metadata.LastToken, info.token)
            setMetadataLocalStorage(login.metadata.LoginEndpoint, info.endpoint)
            setMetadataLocalStorage(login.metadata.LoginEmail, info.email)
            updatePageLoc(getCurrentLocation())
          }
        } catch (err: any) {
          setMetadataLocalStorage(login.metadata.LastToken, null)
        }
      }
    }
  }

  onMount(chooseToken)
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
      <LoginIcon /><span class="fs-title ml-2">{getMetadata(workbench.metadata.PlatformTitle)}</span>
    </div>

    <div class="panel-base" class:panel={$deviceInfo.docWidth > 768} class:white={!$themeStore.dark}>
      <Scroller padding={'1rem 0'}>
        <div class="form-content">
          {#if page === 'onboard'}
            <OnboardForm />
          {:else if page === 'auth'}
            <Auth />
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
      -webkit-mask:
        linear-gradient(#000 0 0) content-box,
        linear-gradient(#000 0 0);
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
