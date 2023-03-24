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
  import core, { Enum } from '@hcengineering/core'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import {
    CircleButton,
    EditBox,
    Icon,
    eventToHTMLElement,
    IconAdd,
    IconMoreH,
    Label,
    showPopup
  } from '@hcengineering/ui'
  import { ContextMenu } from '@hcengineering/view-resources'
  import setting from '../plugin'
  import EnumValues from './EnumValues.svelte'

  const query = createQuery()

  let enums: Enum[] = []
  let selected: Enum | undefined
  const client = getClient()

  query.query(core.class.Enum, {}, (res) => {
    enums = res
    if (selected !== undefined) {
      selected = enums.find((p) => p._id === selected?._id)
    }
  })

  function create () {
    showPopup(setting.component.EditEnum, {}, 'top')
  }

  async function update (value: Enum): Promise<void> {
    await client.update(value, {
      name: value.name
    })
  }
</script>

<div class="antiComponent">
  <div class="ac-header short divide">
    <div class="ac-header__icon"><Icon icon={setting.icon.Enums} size={'medium'} /></div>
    <div class="ac-header__title"><Label label={setting.string.Enums} /></div>
  </div>
  <div class="ac-body columns hScroll">
    <div class="ac-column">
      <div class="flex-between trans-title mb-3">
        <Label label={setting.string.Enums} />
        <CircleButton icon={IconAdd} size="medium" on:click={create} />
      </div>
      <div class="overflow-y-auto">
        {#each enums as value}
          <!-- svelte-ignore a11y-click-events-have-key-events -->
          <div
            class="ac-column__list-item"
            class:selected={selected === value}
            on:click={() => {
              selected = value
            }}
          >
            <EditBox bind:value={value.name} on:change={() => update(value)} />
            <div
              class="hover-trans"
              on:click|stopPropagation={(ev) => {
                showPopup(ContextMenu, { object: value }, eventToHTMLElement(ev), () => {})
              }}
            >
              <IconMoreH size={'medium'} />
            </div>
          </div>
        {/each}
      </div>
    </div>
    <div class="ac-column max">
      {#if selected !== undefined}
        <EnumValues value={selected} />
      {/if}
    </div>
  </div>
</div>
