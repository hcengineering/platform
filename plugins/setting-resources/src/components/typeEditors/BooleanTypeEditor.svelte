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
  import { TypeBoolean } from '@hcengineering/model'
  import { Label } from '@hcengineering/ui'
  import setting from '../../plugin'
  import { createEventDispatcher, onMount } from 'svelte'
  import core, { Type } from '@hcengineering/core'
  import { BooleanEditor } from '@hcengineering/view-resources'

  export let type: Type<boolean> | undefined
  export let defaultValue: boolean | undefined

  const dispatch = createEventDispatcher()

  onMount(() => {
    if (type?._class !== core.class.TypeBoolean) {
      change()
    }
  })

  function change () {
    dispatch('change', {
      type: TypeBoolean(),
      defaultValue
    })
  }
</script>

<span class="label">
  <Label label={setting.string.DefaultValue} />
</span>
<BooleanEditor
  bind:value={defaultValue}
  onChange={(value) => {
    defaultValue = value
    change()
  }}
/>
