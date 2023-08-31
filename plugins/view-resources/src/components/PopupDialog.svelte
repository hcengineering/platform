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
  import type { IntlString } from '@hcengineering/platform'
  import { Label } from '@hcengineering/ui'

  export let label: IntlString
</script>

<div class="card-container">
  <div class="overflow-label label"><Label {label} /></div>
  <div class="content"><slot /></div>
</div>

<style lang="scss">
  .card-container {
    position: relative;
    display: flex;
    flex-direction: column;
    padding: 1rem 1.5rem 1.5rem;
    border-radius: 0.5rem;
    background-color: var(--theme-popup-color);
    border: 1px solid var(--theme-popup-divider);
    box-shadow: var(--theme-popup-shadow);

    .label {
      flex-shrink: 0;
      margin-bottom: 1rem;
      min-height: 1.75rem;
      font-size: 1rem;
      color: var(--theme-caption-color);
    }

    .content {
      flex-shrink: 0;
      flex-grow: 1;
      height: fit-content;
    }
  }
</style>
