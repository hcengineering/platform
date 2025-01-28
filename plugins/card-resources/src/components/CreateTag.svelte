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
  import core, { Class, ClassifierKind, Data, Doc, Ref, generateId } from '@hcengineering/core'
  import { getEmbeddedLabel } from '@hcengineering/platform'
  import { Card, getClient } from '@hcengineering/presentation'
  import setting from '@hcengineering/setting'
  import { EditBox, Icon, Label } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import { createEventDispatcher } from 'svelte'
  import card from '../plugin'

  export let parent: MasterTag | Tag | undefined = undefined
  export let _class: Ref<Class<MasterTag>> | Ref<Class<Tag>>
  let name: string

  const client = getClient()
  const dispatch = createEventDispatcher()

  $: isMasterTag = _class === card.class.MasterTag

  async function save (): Promise<void> {
    const data: Data<MasterTag> = {
      extends: parent?._id ?? card.class.Card,
      label: getEmbeddedLabel(name),
      kind: isMasterTag ? ClassifierKind.CLASS : ClassifierKind.MIXIN,
      icon: isMasterTag ? card.icon.MasterTag : card.icon.Tag
    }
    const baseViewlet = client.getModel().getObject(card.viewlet.CardTable)
    const base = extractObjectProps(baseViewlet)
    const id = generateId<Class<MasterTag>>()
    const ops = client.apply('tag')
    await ops.createDoc(_class, core.space.Model, data, id)
    await ops.createMixin(id, core.class.Mixin, core.space.Model, setting.mixin.Editable, {
      value: true
    })
    await ops.createMixin(id, core.class.Mixin, core.space.Model, setting.mixin.UserMixin, {})
    await ops.createDoc(view.class.Viewlet, core.space.Model, {
      ...base,
      attachTo: id
    })
    await ops.commit()
    dispatch('close')
  }

  function extractObjectProps<T extends Doc> (doc: T): Data<T> {
    const data: any = {}
    for (const key in doc) {
      if (key === '_id') {
        continue
      }
      data[key] = doc[key]
    }
    return data as Data<T>
  }
</script>

<Card
  label={isMasterTag ? card.string.CreateMasterTag : card.string.CreateTag}
  okAction={save}
  canSave={!(name === undefined || name.trim().length === 0)}
  on:close={() => {
    dispatch('close')
  }}
  on:changeContent
>
  <svelte:fragment slot="header">
    <div class="flex-row-center">
      <Icon icon={isMasterTag ? card.icon.MasterTag : card.icon.Tag} size={'large'} />
      <div class="ml-2">
        <Label label={parent?.label ?? (isMasterTag ? card.string.MasterTag : card.string.Tag)} />
      </div>
    </div>
  </svelte:fragment>

  <div class="mb-2"><EditBox autoFocus bind:value={name} placeholder={core.string.Name} /></div>
</Card>
