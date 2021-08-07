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
  <div class="icon">
    <IconAdd size={'small'} />
  </div>
  <Label {label} />
</div>

<style lang="scss">
  .card-container {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    padding: 12px 24px 10px;
    font-size: 14px;
    color: var(--theme-content-dark-color);
    background-color: var(--theme-button-bg-hovered);
    border: 1px dotted var(--theme-bg-accent-color);
    border-radius: 12px;
    cursor: pointer;

    .icon {
      margin-bottom: 4px;
      width: 16px;
      height: 16px;
      opacity: .4;
    }

    &:hover {
      color: var(--theme-caption-color);
      .icon {
        opacity: 1;
      }
    }
  }
</style>
