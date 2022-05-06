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
  import { TypeDate } from '@anticrm/model'
  import { Label } from '@anticrm/ui'
  import { createEventDispatcher, onMount } from 'svelte'
  import view from '../../plugin'
  import BooleanEditor from '../BooleanEditor.svelte'

  const dispatch = createEventDispatcher()

  let withTime: boolean = false

  onMount(() => {
    dispatch('change', { type: TypeDate(withTime) })
  })
</script>

<div class="flex-row-center">
  <Label label={view.string.WithTime} />
  <div class="ml-2">
    <BooleanEditor
      bind:value={withTime}
      onChange={(e) => {
        dispatch('change', TypeDate(e))
      }}
    />
  </div>
</div>
