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
  import type { IntlString } from '@anticrm/platform'
  import { Label } from '@anticrm/ui'

  export let label: IntlString
</script>

<div class="card-container">
  <div class="card-bg" />
  <div class="overflow-label label"><Label {label} /></div>
  <div class="content"><slot /></div>
</div>

<style lang="scss">
  .card-container {
    position: relative;
    display: flex;
    flex-direction: column;
    padding: 32px 1.5rem 1.25rem;
    border-radius: 0.75rem;

    .label {
      flex-shrink: 0;
      margin-bottom: 1.25rem;
      text-transform: uppercase;
      font-weight: 600;
      font-size: 0.75rem;
      color: var(--theme-content-trans-color);
    }

    .content {
      flex-shrink: 0;
      flex-grow: 1;
      height: fit-content;
    }

    .card-bg {
      position: absolute;
      top: 0;
      bottom: 0;
      left: 0;
      right: 0;
      background-color: var(--theme-card-bg);
      border-radius: 0.75rem;
      backdrop-filter: blur(24px);
      box-shadow: var(--theme-card-shadow);
      z-index: -1;
    }
  }
</style>
