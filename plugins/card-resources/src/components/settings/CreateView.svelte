<!--
// Copyright © 2025 Hardcore Engineering Inc.
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
  import { MasterTag, Tag } from '@hcengineering/card'
  import core, { Class, ClassifierKind, Data, Ref } from '@hcengineering/core'
  import { Card, getClient } from '@hcengineering/presentation'
  import { EditBox, Icon, Label } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import { ObjectBox } from '@hcengineering/view-resources'
  import setting from '@hcengineering/setting'
  import card from '../../plugin'
  import view, { ViewletDescriptor } from '@hcengineering/view'

  export let tag: MasterTag | Tag
  export let _class: Ref<Class<MasterTag>> | Ref<Class<Tag>>

  let name: string
  let type: Ref<ViewletDescriptor> | undefined = undefined

  const viewTypes: Ref<ViewletDescriptor>[] = [view.viewlet.Table, view.viewlet.List]

  const client = getClient()
  const dispatch = createEventDispatcher()

  async function save (): Promise<void> {
    dispatch('close')
  }
</script>

<Card
  label={card.string.CreateView}
  okAction={save}
  canSave={!(name === undefined || name.trim().length === 0) && type !== undefined}
  on:close={() => {
    dispatch('close')
  }}
  on:changeContent
>
  <svelte:fragment slot="header">
    {#if tag.label !== undefined}
      <div class="flex-row-center">
        <div class="ml-2">
          <Label label={tag?.label} />
        </div>
      </div>
    {/if}
  </svelte:fragment>
  <div class="mb-2"><EditBox autoFocus bind:value={name} placeholder={core.string.Name} /></div>
  <svelte:fragment slot="pool">
    <ObjectBox
      _class={view.class.ViewletDescriptor}
      label={card.string.SelectViewType}
      showNavigate={false}
      bind:value={type}
      docQuery={{
        _id: { $in: viewTypes }
      }}
    />
  </svelte:fragment>
</Card>
