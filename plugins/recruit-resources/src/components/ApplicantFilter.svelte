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
  import { Class, Doc, Ref } from '@anticrm/core'
  import { Button } from '@anticrm/ui'
  import { Filter } from '@anticrm/view'
  import { FilterQuery } from '@anticrm/view-resources'
  import { createEventDispatcher } from 'svelte'
  import recruit from '../plugin'

  export let _class: Ref<Class<Doc>>
  export let filter: Filter
  export let onChange: (e: Filter) => void
  filter.onRemove = () => {
    FilterQuery.remove(filter.index)
  }

  filter.modes = [recruit.filter.HasActive, recruit.filter.NoActive]
  filter.mode = filter.mode === undefined ? filter.modes[0] : filter.mode
  const dispatch = createEventDispatcher()
</script>

<div class="selectPopup">
  <Button
    label={recruit.string.HasActiveApplicant}
    on:click={async () => {
      filter.mode = recruit.filter.HasActive
      onChange(filter)
      dispatch('close')
    }}
  />
  <Button
    label={recruit.string.HasNoActiveApplicant}
    on:click={async () => {
      filter.mode = recruit.filter.NoActive
      onChange(filter)
      dispatch('close')
    }}
  />
</div>
