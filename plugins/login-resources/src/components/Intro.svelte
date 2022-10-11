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
  import { deviceOptionsStore as deviceInfo } from '@hcengineering/ui'

  export let size: 'small' | 'medium' = 'medium'
</script>

<div class="intro">
  <div class="content">
    <div class="logo {$deviceInfo.theme === 'theme-light' ? 'dark' : 'light'}" />
  </div>
  <div class="slogan">
    <p>A unique place to manage all of your work</p>
    <p>Welcome to the Platform</p>
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
      .logo {
        position: relative;
        &::after {
          position: absolute;
          content: '';
          transform: translate(-50%, -50%);
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
          position: absolute;
          content: '';
          transform: translate(-50%, -50%);
          width: 16rem;
          height: 16rem;
          border: 1.8px solid var(--caption-color);
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
</style>
