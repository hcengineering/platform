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
  import core, { AnyAttribute, Type } from '@hcengineering/core'
  import { TypeBoolean } from '@hcengineering/model'
  import { Label, Toggle } from '@hcengineering/ui'
  import { BooleanEditor } from '@hcengineering/view-resources'
  import { createEventDispatcher, onMount } from 'svelte'
  import setting from '../../plugin'

  export let type: Type<boolean> | undefined
  export let attribute: AnyAttribute | undefined
  export let defaultValue: boolean | undefined

  let showInPresenter = attribute?.showInPresenter ?? false

  const dispatch = createEventDispatcher()

  onMount(() => {
    if (type?._class !== core.class.TypeBoolean) {
      change()
    }
  })

  function change () {
    dispatch('change', {
      type: TypeBoolean(),
      defaultValue,
      extra: { showInPresenter }
    })
  }

  async function changeShowing () {
    dispatch('change', { extra: { showInPresenter } })
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
<span class="label">
  <Label label={setting.string.ShowInTitle} />
</span>
<Toggle bind:on={showInPresenter} on:change={changeShowing} />