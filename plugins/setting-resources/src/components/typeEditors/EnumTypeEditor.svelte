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
  import core, { Enum, EnumOf, IndexKind, Ref } from '@hcengineering/core'
  import { TypeEnum } from '@hcengineering/model'
  import presentation, { getClient } from '@hcengineering/presentation'
  import { Button, Label, showPopup } from '@hcengineering/ui'
  import type { ButtonKind, ButtonSize } from '@hcengineering/ui'
  import { EnumEditor } from '@hcengineering/view-resources'
  import { createEventDispatcher } from 'svelte'
  import setting from '../../plugin'
  import EnumSelect from './EnumSelect.svelte'

  export let type: EnumOf | undefined
  export let editable: boolean = true
  export let value: Enum | undefined
  export let defaultValue: string | undefined
  export let kind: ButtonKind = 'no-border'
  export let size: ButtonSize = 'small'
  export let nested: boolean = false

  const client = getClient()
  const dispatch = createEventDispatcher()

  $: value && changeEnum(value)
  $: ref = value?._id ?? type?.of

  const create = {
    label: setting.string.CreateEnum,
    component: setting.component.EditEnum
  }

  function changeEnum (value: Enum) {
    type = TypeEnum(value._id)
    dispatch('change', { type, defaultValue, index: IndexKind.FullText })
  }

  async function updateSelected (ref: Ref<Enum> | undefined) {
    value = ref !== undefined ? await client.findOne(core.class.Enum, { _id: ref }) : undefined
  }

  $: updateSelected(ref)

  async function edit () {
    if (value === undefined) return
    showPopup(setting.component.EditEnum, { value }, 'top')
  }
</script>

<div class="hulyModal-content__settingsSet-line">
  <span class="label">
    <Label label={core.string.Enum} />
  </span>
  <div class="flex-row-center gap-2">
    {#if editable}
      <EnumSelect label={core.string.Enum} bind:value {create} {kind} {size} />
    {:else if value}
      <div>
        {value.name}
      </div>
    {/if}
    {#if value}
      <Button
        icon={setting.icon.Setting}
        {kind}
        {size}
        showTooltip={{ label: presentation.string.Edit }}
        on:click={edit}
      />
    {/if}
  </div>
</div>
{#if value && type && !nested}
  <div class="hulyModal-content__settingsSet-line">
    <span class="label">
      <Label label={setting.string.DefaultValue} />
    </span>
    <div class="ml-2">
      <EnumEditor
        label={setting.string.SelectAValue}
        {kind}
        {size}
        allowDeselect
        {type}
        value={defaultValue ?? ''}
        onChange={(e) => {
          defaultValue = e
          dispatch('change', { type, defaultValue })
        }}
      />
    </div>
  </div>
{/if}
