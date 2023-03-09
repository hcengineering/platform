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
  import { IconAdd, IconClose } from '@hcengineering/ui'

  export let title: string = 'Unknown'
</script>

<div class="header">
  <div class="title"><span>{title}</span></div>
  <div class="separator" />
  <div class="buttons">
    <div class="button"><IconClose size={'small'} /></div>
    <div class="button"><IconAdd size={'small'} /></div>
  </div>
</div>

<style lang="scss">
  .header {
    width: 100%;
    height: 80px;
    min-height: 80px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 24px 0 40px;

    .title {
      display: flex;
      align-items: center;
      height: 28px;
      padding: 6px 8px;
      border-radius: 0.5rem;
      background-color: var(--trans-content-10);
      span {
        font-weight: 600;
        font-size: 12px;
        text-transform: uppercase;
        color: #56a4ff;
      }
    }
    .separator {
      flex-grow: 1;
    }
    .buttons {
      display: flex;
      flex-direction: row-reverse;
      margin-left: 24px;
      .button {
        width: 24px;
        height: 24px;
        opacity: 0.4;
      }
      .button + .button {
        margin-right: 16px;
      }
    }
  }
</style>
