<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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
  import Label from './Label.svelte'
</script>

<div class="header">
  <div class="user-container">
    <div class="avatar"></div>
    <div class="info">
      <div class="name">Candidate Name</div>
      <div class="title">Candidate title</div>
    </div>
  </div>
</div>

<style lang="scss">

  .header {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 640px;
    min-height: 240px;
    background-image: url(../../img/header-green.png);
    background-repeat: no-repeat;
    background-clip: border-box;
    background-size: cover;
    border-radius: 20px;

    .user-container {
      display: flex;
      flex-direction: column;
      align-items: center;

      .avatar {
        width: 80px;
        height: 80px;
        border-radius: 50%;
        background-color: #C4C4C4;
      }

      .info {
        display: flex;
        flex-direction: column;
        align-items: center;
        margin-top: 10px;

        .name {
          font-size: 16px;
          font-weight: 500;
          line-height: 150%;
          color: var(--theme-caption-color);
        }
        .title {
          font-size: 12px;
          font-weight: 500;
          color: var(--theme-caption-color);
          opacity: .6;
        }
      }
    }
  }

</style>
