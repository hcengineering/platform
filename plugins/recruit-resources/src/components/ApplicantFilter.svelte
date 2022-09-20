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
  import { getClient } from '@hcengineering/presentation'
  import { SelectPopup } from '@hcengineering/ui'
  import view, { Filter, FilterMode } from '@hcengineering/view'
  import { FilterQuery } from '@hcengineering/view-resources'
  import { createEventDispatcher } from 'svelte'
  import recruit from '../plugin'

  // export let _class: Ref<Class<Doc>>
  export let filter: Filter
  export let onChange: (e: Filter) => void

  const client = getClient()
  filter.onRemove = () => {
    FilterQuery.remove(filter.index)
  }

  filter.modes = [recruit.filter.HasActive, recruit.filter.NoActive, recruit.filter.None]
  filter.mode = filter.mode === undefined ? filter.modes[0] : filter.mode
  const dispatch = createEventDispatcher()

  let modes: FilterMode[] = []

  client.findAll(view.class.FilterMode, { _id: { $in: filter.modes } }).then((res) => {
    modes = res
  })
</script>

<div class="selectPopup">
  <SelectPopup
    value={modes.map((it) => ({ ...it, id: it._id }))}
    on:close={(evt) => {
      filter.mode = evt.detail
      onChange(filter)
      dispatch('close')
    }}
  />
</div>
