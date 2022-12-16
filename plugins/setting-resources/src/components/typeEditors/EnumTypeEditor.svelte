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
  import core, { Enum, EnumOf, Ref } from '@hcengineering/core'
  import { TypeEnum } from '@hcengineering/model'
  import presentation, { getClient } from '@hcengineering/presentation'
  import { Button, Label, showPopup } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import setting from '../../plugin'
  import EnumSelect from './EnumSelect.svelte'

  export let type: EnumOf | undefined
  export let editable: boolean = true
  export let value: Enum | undefined

  const client = getClient()
  const dispatch = createEventDispatcher()

  $: value && dispatch('change', { type: TypeEnum(value._id) })
  $: ref = value?._id ?? type?.of

  const create = {
    label: setting.string.CreateEnum,
    component: setting.component.EditEnum
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

<div class="flex-row-center flex-grow">
  <Label label={core.string.Enum} />
  <div class="ml-4">
    {#if editable}
      <EnumSelect label={core.string.Enum} bind:value {create} />
    {:else if value}
      {value.name}
    {/if}
  </div>
  {#if value}
    <div class="ml-2">
      <Button
        icon={setting.icon.Setting}
        kind={'no-border'}
        size={'small'}
        showTooltip={{ label: presentation.string.Edit }}
        on:click={edit}
      />
    </div>
  {/if}
</div>
