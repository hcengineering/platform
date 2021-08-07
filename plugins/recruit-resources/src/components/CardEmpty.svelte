<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
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
  import type { IntlString } from '@anticrm/platform'
  import { Label } from '@anticrm/ui'
  import { IconAdd } from '@anticrm/ui'

  export let label: IntlString
</script>

<div class="card-container">
  <div class="circle">
    <div class="icon">
      <IconAdd size={'large'} />
    </div>
  </div>
  <Label {label} />
</div>

<style lang="scss">
  .card-container {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    padding: 20px 24px;
    font-size: 14px;
    line-height: 18px;
    color: var(--theme-caption-color);
    background-color: var(--theme-button-bg-enabled);
    border: 1px solid var(--theme-bg-accent-color);
    border-radius: 12px;
    cursor: pointer;

    .circle {
      display: flex;
      justify-content: center;
      align-items: center;
      margin-bottom: 20px;
      width: 80px;
      height: 80px;
      background-color: var(--theme-bg-accent-color);
      border-radius: 50%;

      .icon {
        width: 24px;
        height: 24px;
        opacity: .6;
      }
    }

    &:hover {
      background-color: var(--theme-bg-accent-hover);
      box-shadow: 0px 12px 40px rgba(0, 0, 0, .15);

      .circle .icon {
        opacity: 1;
      }
    }
  }
</style>
