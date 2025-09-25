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
  import type { TypeNumber as TypeNumberType } from '@hcengineering/core'
  import core from '@hcengineering/core'
  import { TypeNumber } from '@hcengineering/model'
  import { EditBox, Label, NumberInput, Toggle } from '@hcengineering/ui'
  import { createEventDispatcher, onMount } from 'svelte'
  import setting from '../../plugin'

  export let type: TypeNumberType
  export let editable: boolean = true

  const dispatch = createEventDispatcher()

  let min: number | undefined = type?.min
  let max: number | undefined = type?.max
  let isInteger = type?.digits === 0

  function updateType (): void {
    dispatch('change', { type: TypeNumber(min, max, isInteger ? 0 : undefined) })
  }

  onMount(() => {
    if (type?._class !== core.class.TypeNumber) {
      dispatch('change', { type: TypeNumber() })
    }
  })

  function changeIsInteger (e: CustomEvent<boolean>): void {
    isInteger = e.detail
    updateType()
  }
</script>

<span class="label">
  <Label label={setting.string.MinValue} />
</span>
<NumberInput
  bind:value={min}
  disabled={!editable}
  maxWidth={'100%'}
  placeholder={setting.string.MinValue}
  on:change={updateType}
/>
<Label label={setting.string.MaxValue} />
<NumberInput
  bind:value={max}
  disabled={!editable}
  maxWidth={'100%'}
  placeholder={setting.string.MaxValue}
  on:change={updateType}
/>
<Label label={setting.string.IntegerOnly} />
<Toggle on={isInteger} on:change={changeIsInteger} disabled={!editable} />
