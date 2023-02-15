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
  import { MessageViewer } from '@hcengineering/presentation'
  import { deviceOptionsStore as deviceInfo, resizeObserver } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'

  export let value: string

  const dispatch = createEventDispatcher()
</script>

<div
  class="antiCard {$deviceInfo.isMobile ? 'mobile' : 'dialog'}"
  use:resizeObserver={() => {
    dispatch('changeContent')
  }}
  on:close={() => dispatch('close', null)}
  style:overflow={'auto'}
  style:width={'100%'}
>
  <div class="flex-grow p-4">
    <MessageViewer message={value} />
  </div>
</div>
