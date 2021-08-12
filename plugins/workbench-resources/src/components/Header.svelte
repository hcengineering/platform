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
  import type { IntlString, Asset } from '@anticrm/platform'
  import { Icon } from '@anticrm/ui'

  export let icon: Asset | undefined
  export let label: IntlString
  export let description: IntlString | undefined
</script>

<div class="flex flex-col flex-grow w-full">
  <div class="flex items-center">
    {#if icon }<span class="mr-2 opacity-60"><Icon {icon} size={'small'}/></span>{/if}
    <span class="flex-grow whitespace-nowrap overflow-ellipsis overflow-hidden select-none text-base font-medium caption-color">
      {label}
    </span>
  </div>
  {#if description }
    <div class="flex-grow whitespace-nowrap overflow-ellipsis overflow-hidden select-none text-xs content-trans-color">
      {description}
    </div>
  {/if}
</div>
