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
    padding: 2rem 1.75rem 1.75rem;
    border-radius: 0.75rem;
    background: var(--popup-bg-color);
    box-shadow: var(--popup-shadow);

    .label {
      flex-shrink: 0;
      margin-bottom: 1.25rem;
      text-transform: uppercase;
      font-weight: 600;
      font-size: 0.75rem;
      color: var(--dark-color);
    }

    .content {
      flex-shrink: 0;
      flex-grow: 1;
      height: fit-content;
    }
  }
</style>
