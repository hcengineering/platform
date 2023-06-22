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
  import { translate } from '@hcengineering/platform'
  import { deviceOptionsStore as deviceInfo, themeStore } from '@hcengineering/ui'
  import plugin from '../plugin'
  export let landscape: boolean = false
  export let mini: boolean = false

  let slogan = ''

  translate(plugin.string.Slogan, {}, $themeStore.language)
    .then((r) => {
      slogan = r
    })
    .catch((err) => {
      console.error(err)
    })
</script>

<div class="intro" class:landscape class:mini>
  <div class="content">
    <div class="logo {$deviceInfo.theme === 'theme-light' ? 'dark' : 'light'}" />
  </div>
  <div class="slogan">
    {#each slogan.split('\n') as p}
      <p>
        {p}
      </p>
    {/each}
  </div>
</div>

<style lang="scss">
  .intro {
    display: flex;
    flex-direction: column;
    flex-grow: 1;
    overflow: hidden;
    min-width: 20rem;
    min-height: 26rem;

    .content {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      flex-grow: 1;
      transition: all 0.15s var(--timing-main);
      .logo {
        position: relative;
        &::after,
        &::before {
          position: absolute;
          content: '';
          transform: translate(-50%, -50%);
        }
        &::after {
          width: 63px;
          height: 79px;
        }
        &.light::after {
          background: center url('../../img/logo-light.svg');
        }
        &.dark::after {
          background: center url('../../img/logo-dark.svg');
        }
        &::before {
          width: 16rem;
          height: 16rem;
          border: 1.8px solid var(--caption-color);
          border-radius: 50%;
          opacity: 0.08;
        }
      }
    }
    .slogan {
      transition: all 0.15s var(--timing-main);
      margin-bottom: 60px;
      p {
        margin: 0;
        font-weight: 400;
        font-size: 0.8rem;
        text-align: center;
        color: var(--caption-color);
        opacity: 0.8;
      }
    }

    &.landscape {
      flex-direction: row;
      justify-content: center;
      align-items: center;
      min-width: 20rem;
      min-height: 10rem;
      margin-bottom: 1.25rem;

      .content .logo::after,
      .content .logo::before {
        transform: translate(-50%, -50%) scale(0.5);
      }
      .content {
        max-width: 8rem;
        max-height: 10rem;
        margin: 0 1rem 0 0;
      }
      .slogan {
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        margin: 0 0 0 1rem;
      }

      &.mini {
        min-width: 16rem;
        min-height: 8rem;

        .content .logo::after,
        .content .logo::before {
          transform: translate(-50%, -50%) scale(0.35);
        }
        .content {
          max-width: 5.5rem;
          max-height: 8rem;
          margin: 0 0.5rem 0 0;
        }
        .slogan {
          margin: 0 0 0 0.5rem;
          p {
            font-size: 0.6rem;
          }
        }
      }
    }
  }
</style>
