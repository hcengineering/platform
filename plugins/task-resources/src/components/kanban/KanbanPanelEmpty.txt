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

<div class="panel-container step-lr75">
  <div class="circle">
    <div class="icon">
      <IconAdd size={'large'} />
    </div>
  </div>
  <Label {label} />
</div>

<style lang="scss">
  .panel-container {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    width: 20rem;
    height: 100%;
    padding: .75rem;
    color: var(--theme-caption-color);
    background-color: var(--theme-bg-color);
    border: 1px dotted var(--theme-bg-accent-color);
    border-radius: .75rem;
    cursor: pointer;

    .circle {
      display: flex;
      justify-content: center;
      align-items: center;
      margin-bottom: 1.25rem;
      width: 5rem;
      height: 5rem;
      background-color: var(--theme-bg-accent-color);
      border-radius: 50%;

      .icon { opacity: .6; }
    }

    &:hover {
      background-color: var(--theme-bg-accent-color);
      .circle .icon { opacity: 1; }
    }
  }
</style>
