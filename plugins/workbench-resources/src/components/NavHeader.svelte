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
  import type { IntlString } from '@anticrm/platform'
  import { ActionIcon, IconMoreH } from '@anticrm/ui'

  export let label: IntlString
  export let action: () => Promise<void>
</script>

<div class="container">
  <span class="overflow-label label">{label}</span>
  <ActionIcon label={'More...'} icon={IconMoreH} size={'small'} {action} />
</div>

<style lang="scss">
  .container {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 1.75rem;
    height: 4.5rem;

    .label {
      font-weight: 500;
      font-size: 1rem;
      color: var(--theme-caption-color);
    }
  }
</style>
