<!--
// Copyright © 2023 Hardcore Engineering Inc.
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
  import { Channel, ChannelProvider, Employee, getName } from '@hcengineering/contact'
  import core, { Doc, DocumentUpdate, Mixin, Ref, TxProcessor } from '@hcengineering/core'
  import login from '@hcengineering/login'
  import { getResource } from '@hcengineering/platform'
  import { Avatar, Card, createQuery, EmployeeBox, getClient } from '@hcengineering/presentation'
  import { DatePresenter, Grid, Toggle } from '@hcengineering/ui'
  import { isCollectionAttr, StringEditor } from '@hcengineering/view-resources'
  import { createEventDispatcher } from 'svelte'
  import contact from '../plugin'
  import ChannelPresenter from './ChannelPresenter.svelte'
  import ChannelsDropdown from './ChannelsDropdown.svelte'
  import MergeAttributeComparer from './MergeAttributeComparer.svelte'
  import MergeComparer from './MergeComparer.svelte'

  export let value: Employee
  const dispatch = createEventDispatcher()
  const client = getClient()
  const hierarchy = client.getHierarchy()
  const parent = hierarchy.getParentClass(contact.class.Employee)
  const mixins = hierarchy.getDescendants(parent).filter((p) => hierarchy.isMixin(p))
  let targetEmployee: Ref<Employee> | undefined = undefined
  let targetEmp: Employee | undefined = undefined

  const targetQuery = createQuery()
  $: targetEmployee &&
    targetQuery.query(contact.class.Employee, { _id: targetEmployee }, (res) => {
      ;[targetEmp] = res
      update = fillUpdate(value, targetEmp)
      mixinUpdate = fillMixinUpdate(value, targetEmp)
      result = hierarchy.clone(targetEmp)
      applyUpdate(update)
    })

  function fillUpdate (value: Employee, target: Employee): DocumentUpdate<Employee> {
    const res: DocumentUpdate<Employee> = {}
    const attributes = hierarchy.getOwnAttributes(contact.class.Employee)
    for (const attribute of attributes) {
      const key = attribute[0]
      if (attribute[1].hidden) continue
      if (isCollectionAttr(hierarchy, { key, attr: attribute[1] })) continue
      if ((target as any)[key] === undefined) {
        ;(res as any)[key] = (value as any)[key]
      }
    }
    return res
  }

  function fillMixinUpdate (value: Employee, target: Employee): Record<Ref<Mixin<Doc>>, DocumentUpdate<Doc>> {
    const res: Record<Ref<Mixin<Doc>>, DocumentUpdate<Doc>> = {}
    for (const mixin of mixins) {
      if (!hierarchy.hasMixin(value, mixin)) continue
      const attributes = hierarchy.getOwnAttributes(mixin)
      for (const attribute of attributes) {
        const key = attribute[0]
        const from = hierarchy.as(value, mixin)
        const to = hierarchy.as(target, mixin)
        if ((from as any)[key] !== undefined && (to as any)[key] === undefined) {
          const obj: DocumentUpdate<Doc> = res[mixin] ?? {}
          ;(obj as any)[key] = (from as any)[key]
          res[mixin] = obj
        }
      }
    }
    return res
  }

  let update: DocumentUpdate<Employee> = {}
  let mixinUpdate: Record<Ref<Mixin<Doc>>, DocumentUpdate<Doc>> = {}
  let result: Employee = value

  function applyUpdate (update: DocumentUpdate<Employee>): void {
    result = hierarchy.clone(targetEmp)
    TxProcessor.applyUpdate(result, update)
  }

  async function merge (): Promise<void> {
    if (targetEmp === undefined) return
    if (Object.keys(update).length > 0) {
      await client.update(targetEmp, update)
    }
    await client.update(value, { mergedTo: targetEmp._id, active: false })
    for (const channel of resultChannels.values()) {
      if (channel.attachedTo === targetEmp._id) continue
      await client.update(channel, { attachedTo: targetEmp._id })
      const remove = targetConflict.get(channel.provider)
      if (remove !== undefined) {
        await client.remove(remove)
      }
    }
    for (const mixin in mixinUpdate) {
      const attrs = (mixinUpdate as any)[mixin]
      if (Object.keys(attrs).length > 0) {
        await client.updateMixin(targetEmp._id, targetEmp._class, targetEmp.space, mixin as Ref<Mixin<Doc>>, attrs)
      } else if (!hierarchy.hasMixin(targetEmp, mixin as Ref<Mixin<Doc>>)) {
        await client.createMixin(targetEmp._id, targetEmp._class, targetEmp.space, mixin as Ref<Mixin<Doc>>, {})
      }
    }
    const account = await client.findOne(contact.class.EmployeeAccount, { employee: value._id })
    if (account !== undefined) {
      const leaveWorkspace = await getResource(login.function.LeaveWorkspace)
      await leaveWorkspace(account.email)
    }
    dispatch('close')
  }

  function select (field: string, targetValue: boolean) {
    if (!targetValue) {
      ;(update as any)[field] = (value as any)[field]
    } else {
      delete (update as any)[field]
    }
    applyUpdate(update)
  }

  function mergeChannels (oldChannels: Channel[], targetChannels: Channel[]): Map<Ref<ChannelProvider>, Channel> {
    targetConflict.clear()
    valueConflict.clear()
    const res: Channel[] = [...targetChannels]
    const map = new Map(targetChannels.map((p) => [p.provider, p]))
    for (const channel of oldChannels) {
      if (channel.provider === contact.channelProvider.Email) continue
      const target = map.get(channel.provider)
      if (target !== undefined) {
        targetConflict.set(target.provider, target)
        valueConflict.set(channel.provider, channel)
      } else {
        res.push(channel)
      }
    }
    targetConflict = targetConflict
    valueConflict = valueConflict
    return new Map(res.map((p) => [p.provider, p]))
  }

  let resultChannels: Map<Ref<ChannelProvider>, Channel> = new Map()
  let oldChannels: Channel[] = []
  let valueConflict: Map<Ref<ChannelProvider>, Channel> = new Map()
  let targetConflict: Map<Ref<ChannelProvider>, Channel> = new Map()
  const valueChannelsQuery = createQuery()
  valueChannelsQuery.query(contact.class.Channel, { attachedTo: value._id }, (res) => {
    oldChannels = res
    resultChannels = mergeChannels(oldChannels, targetChannels)
  })

  let targetChannels: Channel[] = []
  const targetChannelsQuery = createQuery()
  $: targetEmployee &&
    targetChannelsQuery.query(contact.class.Channel, { attachedTo: targetEmployee }, (res) => {
      targetChannels = res
      resultChannels = mergeChannels(oldChannels, targetChannels)
    })

  function selectChannel (isTarget: boolean, targetChannel: Channel, value: Channel) {
    const res = isTarget ? targetChannel : value
    resultChannels.set(res.provider, res)
    resultChannels = resultChannels
  }

  const attributes = hierarchy.getAllAttributes(contact.class.Employee, core.class.Doc)
  const ignoreKeys = ['name', 'avatar', 'createOn']
  const objectAttributes = Array.from(attributes.entries()).filter(
    (p) => !p[1].hidden && !ignoreKeys.includes(p[0]) && !isCollectionAttr(hierarchy, { key: p[0], attr: p[1] })
  )

  function getMixinAttributes (mixin: Ref<Mixin<Doc>>): string[] {
    const attr = hierarchy.getOwnAttributes(mixin)
    const res = Array.from(attr.entries()).filter((p) => !isCollectionAttr(hierarchy, { key: p[0], attr: p[1] }))
    return res.map((p) => p[0])
  }

  function selectMixin (mixin: Ref<Mixin<Doc>>, field: string, targetValue: boolean) {
    const upd = mixinUpdate[mixin] ?? {}
    if (!targetValue) {
      ;(upd as any)[field] = (value as any)[field]
    } else {
      delete (upd as any)[field]
    }
    mixinUpdate[mixin] = upd
  }
</script>

<Card
  label={contact.string.MergeEmployee}
  okLabel={contact.string.MergeEmployee}
  fullSize
  okAction={merge}
  canSave={targetEmp !== undefined}
  onCancel={() => dispatch('close')}
>
  <div class="flex-row-reverse">
    <EmployeeBox
      showNavigate={false}
      label={contact.string.MergeEmployee}
      docQuery={{ active: true, _id: { $ne: value._id } }}
      bind:value={targetEmployee}
    />
  </div>
  {#if targetEmp}
    <Grid column={3} rowGap={0.5} columnGap={0.5}>
      <MergeComparer key="avatar" {value} {targetEmp} onChange={select}>
        <svelte:fragment slot="item" let:item>
          <Avatar avatar={item.avatar} size={'medium'} icon={contact.icon.Person} />
        </svelte:fragment>
      </MergeComparer>
      <MergeComparer key="name" {value} {targetEmp} onChange={select}>
        <svelte:fragment slot="item" let:item>
          {getName(item)}
        </svelte:fragment>
      </MergeComparer>
      {#each objectAttributes as attribute}
        <MergeAttributeComparer
          key={attribute[0]}
          {value}
          {targetEmp}
          onChange={select}
          _class={contact.class.Employee}
        />
      {/each}
      {#each mixins as mixin}
        {@const attributes = getMixinAttributes(mixin)}
        {#each attributes as attribute}
          <MergeAttributeComparer
            key={attribute}
            {value}
            {targetEmp}
            onChange={(key, value) => selectMixin(mixin, key, value)}
            _class={mixin}
          />
        {/each}
      {/each}
      {#each Array.from(targetConflict.values()) as conflict}
        {@const val = valueConflict.get(conflict.provider)}
        {#if val}
          <div class="flex-center max-w-40">
            <ChannelPresenter value={val} />
          </div>
          <div class="flex-center">
            <Toggle
              on={true}
              on:change={(e) => {
                selectChannel(e.detail, conflict, val)
              }}
            />
          </div>
          <div class="flex-center max-w-40">
            <ChannelPresenter value={conflict} />
          </div>
        {/if}
      {/each}
    </Grid>
    <div class="flex-col-center">
      <Avatar avatar={result.avatar} size={'large'} icon={contact.icon.Person} />
      {getName(result)}
      <DatePresenter value={result.birthday} />
      <StringEditor value={result.city} readonly placeholder={contact.string.Location} />
      <ChannelsDropdown
        value={Array.from(resultChannels.values())}
        editable={false}
        kind={'link-bordered'}
        size={'small'}
        length={'full'}
        shape={'circle'}
      />
    </div>
  {/if}
</Card>
