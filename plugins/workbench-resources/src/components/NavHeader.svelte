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
  import { ActionIcon } from '@anticrm/ui'
  import MoreH from './icons/MoreH.svelte'

  export let label: IntlString
  export let action: () => Promise<void>
</script>

<div class="flex justify-between items-center px-8 h-20">
  <span class="flex-grow whitespace-nowrap overflow-ellipsis overflow-hidden select-none text-lg font-medium caption-color">
    {label}
  </span>
  <ActionIcon label={'More...'} icon={MoreH} size={'small'} {action}/>
</div>
