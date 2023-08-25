<!--
// Copyright © 2023 Hardcore Engineering Inc.
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
  import { createEventDispatcher } from 'svelte'
  import { Button, IconClose, IconMoreH, TimeShiftPresenter } from '@hcengineering/ui'

  export let reminder: number

  const dispatch = createEventDispatcher()
</script>

<!-- svelte-ignore a11y-no-noninteractive-tabindex -->
<div class="antiOption leftPadding cursor-pointer step-tb25" tabindex={0}>
  <TimeShiftPresenter value={reminder * -1} />
  <div class="tools flex-row-center flex-no-shrink gap-1">
    <Button
      icon={IconMoreH}
      kind={'ghost'}
      size={'x-small'}
      padding={'0 .5rem'}
      focusIndex={-1}
      noFocus
      on:click={(e) => dispatch('edit', e)}
    />
    <Button
      icon={IconClose}
      kind={'ghost'}
      size={'x-small'}
      padding={'0 .5rem'}
      focusIndex={-1}
      noFocus
      on:click={() => dispatch('remove')}
    />
  </div>
</div>
