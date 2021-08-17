<!--
// Copyright © 2020 Anticrm Platform Contributors.
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
  import LoginForm from './LoginForm.svelte'
  import SignupForm from './SignupForm.svelte'

  let page = 'login'
</script>

<div class="container">
  <div class="panel">
    {#if page === 'login'}
      <LoginForm on:switch={(event) => page = event.detail}/>
    {:else if page === 'signup'}
      <SignupForm on:switch={(event) => page = event.detail}/>
    {/if}
  </div>
  <div class="intro">
    <div class="content">
      <div class="logo"> </div>
    </div>
    <div class="slogan">
      <p>A unique place to manage all of your work</p>
      <p>Welcome to the Platform</p>
    </div>
  </div>
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
            content: "";
            background: center url("../../img/logo.svg");
            transform: translate(-50%, -50%);
            width: 63px;
            height: 79px;
          }
          &:before {
            position: absolute;
            content: "";
            transform: translate(-50%, -50%);
            width: 16rem;
            height: 16rem;
            border: 1.8px solid var(--theme-caption-color);
            border-radius: 50%;
            opacity: .08;
          }
        }
      }
      .slogan {
        margin-bottom: 60px;
        p {
          margin: 0;
          font-weight: 400;
          font-size: .8rem;
          text-align: center;
          color: var(--theme-caption-color);
          opacity: .8;
        }
      }
    }
  }
</style>