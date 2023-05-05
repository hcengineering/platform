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
  import { IconFolder } from '@hcengineering/ui'

  import type { Space } from '@hcengineering/core'

  export let value: Space
  export let subtitle: string | undefined = undefined
  export let size: 'medium' | 'large'
</script>

<div class="flex-row-center">
  <div class="flex-center {size} caption-color flex-no-shrink"><IconFolder size={'small'} /></div>
  <div class="flex-col ml-2 min-w-0">
    {#if subtitle}<div class="content-dark-color text-sm">{subtitle}</div>{/if}
    <div class="content-color overflow-label">{value.name}</div>
  </div>
</div>

<style lang="scss">
  .medium {
    width: 1.75rem;
    height: 1.75rem;
  }
  .large {
    width: 2.25rem;
    height: 2.25rem;
  }
</style>
