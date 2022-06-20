<!--
// Copyright © 2022 Hardcore Engineering Inc.
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
  import { formatName } from '@anticrm/contact'
  import { WithLookup } from '@anticrm/core'
  import { Staff } from '@anticrm/hr'
  import { Avatar } from '@anticrm/presentation'

  export let value: WithLookup<Staff>
</script>

<div class="flex-between w-full p-4">
  <div class="flex-row-center">
    <Avatar avatar={value.avatar} size={'medium'} />
    <div class="fs-title ml-2">
      {formatName(value.name)}
    </div>
  </div>
  <div>
    {#if value.$lookup?.department}
      {value.$lookup.department.name}
    {/if}
  </div>
</div>
