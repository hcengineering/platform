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
  import { TypeDate as DateType } from '@hcengineering/core'
  import { TypeDate } from '@hcengineering/model'
  import { Label } from '@hcengineering/ui'
  import { createEventDispatcher, onMount } from 'svelte'
  import setting from '../../plugin'
  import BooleanEditor from '@hcengineering/view-resources/src/components/BooleanEditor.svelte'
  import BooleanPresenter from '@hcengineering/view-resources/src/components/BooleanPresenter.svelte'

  export let type: DateType | undefined
  export let editable: boolean = true
  const dispatch = createEventDispatcher()

  let withTime: boolean = type?.withTime ?? false

  onMount(() => {
    if (type === undefined) {
      dispatch('change', { type: TypeDate(withTime) })
    }
  })
</script>

<div class="flex-row-center">
  <Label label={setting.string.WithTime} />
  <div class="ml-2">
    {#if editable}
      <BooleanEditor
        withoutUndefined
        bind:value={withTime}
        onChange={(e) => {
          dispatch('change', { type: TypeDate(e) })
        }}
      />
    {:else}
      <BooleanPresenter value={withTime} />
    {/if}
  </div>
</div>
