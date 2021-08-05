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
    <div class="back-panel-dark"/>
    <div class="back-panel-light">
      <div class="bg-noise opacity-3"/>
    </div>
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
  @import "@anticrm/theme/styles/mixins.scss";

  .bg-noise {
    @include bg-fullsize;
    background: url('../../img/noise.png');
    z-index: -1;
  }
  .opacity-3 {
    opacity: 0.03;
  }

  .container {
    display: flex;
    flex-direction: row;
    height: 100%;
    padding: 0px 20px 20px 20px;

    .panel {
      position: relative;
      overflow: hidden;
      margin-right: 20px;
      width: 668px;
      height: 100%;
      border-radius: 20px;

      .back-panel-light {
        @include bg-layer(linear-gradient(158.74deg, rgba(205, 166, 255, 0.12) 5.62%, rgba(255, 255, 255, 0) 97.09%), 0.3);
        z-index: -1;
      }
      .back-panel-dark {
        @include bg-layer(#1D1D23, 0.5);
        z-index: -1;
      }
    }

    .intro {
      display: flex;
      flex-direction: column;
      flex-grow: 1;
      overflow: hidden;
      min-width: 320px;

      .content {
        display: flex;
        flex-direction: column;
        flex-grow: 1;
        justify-content: center;
        align-items: center;
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
            width: 255px;
            height: 255px;
            border: 1.8px solid #FFFFFF;
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
          font-size: 13px;
          line-height: 19px;
          text-align: center;
          color: #FFFFFF;
          opacity: 0.8;
        }
      }
    }
  }
</style>