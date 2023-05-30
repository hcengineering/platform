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
  import core, { Class, ClassifierKind, Data, Doc, Mixin } from '@hcengineering/core'
  import { getEmbeddedLabel } from '@hcengineering/platform'
  import { Card, getClient } from '@hcengineering/presentation'
  import { EditBox, Icon, Label } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import setting from '../plugin'

  export let value: Class<Doc>
  let name: string

  const client = getClient()
  const dispatch = createEventDispatcher()

  async function save (): Promise<void> {
    const data: Data<Mixin<Class<Doc>>> = {
      extends: value._id,
      label: getEmbeddedLabel(name),
      kind: ClassifierKind.MIXIN,
      icon: value.icon
    }
    const id = await client.createDoc(core.class.Mixin, core.space.Model, data)
    await client.createMixin(id, core.class.Mixin, core.space.Model, setting.mixin.Editable, {
      value: true
    })
    await client.createMixin(id, core.class.Mixin, core.space.Model, setting.mixin.UserMixin, {})
    dispatch('close')
  }
</script>

<Card
  label={setting.string.CreateMixin}
  okAction={save}
  canSave={!(name === undefined || name.trim().length === 0)}
  on:close={() => {
    dispatch('close')
  }}
  on:changeContent
>
  <svelte:fragment slot="header">
    <div class="flex-row-center">
      {#if value.icon}
        <Icon icon={value.icon} size={'large'} />
      {/if}
      <div class="ml-2">
        <Label label={value.label} />
      </div>
    </div>
  </svelte:fragment>

  <div class="mb-2"><EditBox autoFocus bind:value={name} placeholder={core.string.Name} /></div>
</Card>
