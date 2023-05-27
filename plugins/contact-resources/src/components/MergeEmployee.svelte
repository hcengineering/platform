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
  import { Channel, Employee, getName } from '@hcengineering/contact'
  import core, { Doc, DocumentUpdate, Mixin, Ref, TxProcessor } from '@hcengineering/core'
  import { Card, createQuery, getClient } from '@hcengineering/presentation'
  import { Toggle } from '@hcengineering/ui'
  import { isCollectionAttr } from '@hcengineering/view-resources'
  import { createEventDispatcher } from 'svelte'
  import contact from '../plugin'
  import Avatar from './Avatar.svelte'
  import ChannelPresenter from './ChannelPresenter.svelte'
  import ChannelsDropdown from './ChannelsDropdown.svelte'
  import EditEmployee from './EditEmployee.svelte'
  import EmployeeBox from './EmployeeBox.svelte'
  import MergeAttributeComparer from './MergeAttributeComparer.svelte'
  import MergeComparer from './MergeComparer.svelte'

  export let value: Employee
  const dispatch = createEventDispatcher()
  const client = getClient()
  const hierarchy = client.getHierarchy()
  const parent = hierarchy.getParentClass(contact.class.Employee)
  const mixins = hierarchy.getDescendants(parent).filter((p) => hierarchy.isMixin(p))

  let sourceEmployee = value._id
  let sourceEmp: Employee | undefined = undefined

  let targetEmployee: Ref<Employee> | undefined = undefined
  let targetEmp: Employee | undefined = undefined

  const targetQuery = createQuery()
  $: targetEmployee &&
    sourceEmployee &&
    targetQuery.query(contact.class.Employee, { _id: { $in: [sourceEmployee, targetEmployee] } }, (res) => {
      // ;[targetEmp] = res
      sourceEmp = res.find((it) => it._id === sourceEmployee)
      targetEmp = res.find((it) => it._id === targetEmployee)
      if (sourceEmp && targetEmp) {
        update = fillUpdate(sourceEmp, targetEmp)
        mixinUpdate = fillMixinUpdate(sourceEmp, targetEmp)
        applyUpdate(update)
      }
    })

  function fillUpdate (source: Employee, target: Employee): DocumentUpdate<Employee> {
    const res: DocumentUpdate<Employee> = {}
    const attributes = hierarchy.getOwnAttributes(contact.class.Employee)
    for (const attribute of attributes) {
      const key = attribute[0]
      if (attribute[1].hidden) continue
      if (isCollectionAttr(hierarchy, { key, attr: attribute[1] })) continue
      if ((target as any)[key] === undefined) {
        ;(res as any)[key] = (source as any)[key]
      }
    }
    return res
  }

  function fillMixinUpdate (source: Employee, target: Employee): Record<Ref<Mixin<Doc>>, DocumentUpdate<Doc>> {
    const res: Record<Ref<Mixin<Doc>>, DocumentUpdate<Doc>> = {}
    for (const mixin of mixins) {
      if (!hierarchy.hasMixin(source, mixin)) continue
      const attributes = hierarchy.getOwnAttributes(mixin)
      for (const attribute of attributes) {
        const key = attribute[0]
        const from = hierarchy.as(source, mixin)
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

  let result: Employee = { ...value }

  function applyUpdate (update: DocumentUpdate<Employee>): void {
    const r = hierarchy.clone(targetEmp)
    TxProcessor.applyUpdate(r, update)
    result = r
  }

  async function merge (): Promise<void> {
    if (sourceEmp === undefined || targetEmp === undefined) return
    if (Object.keys(update).length > 0) {
      if (update.avatar !== undefined || sourceEmp.avatar === targetEmp.avatar) {
        // We replace avatar, we need to update source with target
        await client.update(sourceEmp, { avatar: sourceEmp.avatar === targetEmp.avatar ? '' : targetEmp.avatar })
      }
      await client.update(targetEmp, update)
    }
    await client.update(sourceEmp, { mergedTo: targetEmp._id, active: false })
    for (const channel of resultChannels.values()) {
      if (channel.attachedTo !== targetEmp._id) continue
      await client.update(channel, { attachedTo: targetEmp._id })
    }
    for (const old of oldChannels) {
      if ((enabledChannels.get(old._id) ?? true) === false) {
        await client.remove(old)
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

    dispatch('close')
  }

  function select (field: string, targetValue: boolean) {
    if (!targetValue) {
      ;(update as any)[field] = (sourceEmp as any)[field]
    } else {
      delete (update as any)[field]
    }
    update = update
    applyUpdate(update)
  }

  function mergeChannels (
    oldChannels: Channel[],
    targetChannels: Channel[],
    enabledChannels: Map<Ref<Channel>, boolean>
  ): Channel[] {
    const res: Channel[] = []
    for (const channel of [...targetChannels, ...oldChannels]) {
      // if (channel.provider === contact.channelProvider.Email) continue
      const target = enabledChannels.get(channel._id) ?? true

      if (target) {
        // Add if missing
        if (!res.some((it) => it.provider === channel.provider && it.value === channel.value)) {
          res.push(channel)
        }
      }
    }
    return res
  }

  let enabledChannels: Map<Ref<Channel>, boolean> = new Map()

  let resultChannels: Channel[] = []
  let oldChannels: Channel[] = []
  const valueChannelsQuery = createQuery()

  $: valueChannelsQuery.query(contact.class.Channel, { attachedTo: sourceEmployee }, (res) => {
    oldChannels = res
  })

  let targetChannels: Channel[] = []
  const targetChannelsQuery = createQuery()
  $: targetEmployee &&
    targetChannelsQuery.query(contact.class.Channel, { attachedTo: targetEmployee }, (res) => {
      targetChannels = res
    })

  $: resultChannels = mergeChannels(oldChannels, targetChannels, enabledChannels)

  const attributes = hierarchy.getAllAttributes(contact.class.Employee, core.class.Doc)
  const ignoreKeys = ['name', 'avatar', 'createdOn']
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
  const toAny = (a: any) => a
</script>

<Card
  label={contact.string.MergeEmployee}
  okLabel={contact.string.MergeEmployee}
  fullSize
  okAction={merge}
  canSave={targetEmp !== undefined}
  onCancel={() => dispatch('close')}
  on:changeContent
>
  <div class="flex-row flex-between">
    <div class="flex-row-center">
      <EmployeeBox
        showNavigate={false}
        label={contact.string.MergeEmployeeFrom}
        docQuery={{ active: { $in: [true, false] } }}
        bind:value={sourceEmployee}
      />
      <ChannelsDropdown
        value={oldChannels}
        editable={false}
        kind={'link-bordered'}
        size={'small'}
        length={'full'}
        shape={'circle'}
      />
    </div>
    >>
    <div class="flex-row-center">
      <EmployeeBox
        showNavigate={false}
        label={contact.string.MergeEmployeeTo}
        docQuery={{ active: { $in: [true, false] } }}
        bind:value={targetEmployee}
      />
      <ChannelsDropdown
        value={targetChannels}
        editable={false}
        kind={'link-bordered'}
        size={'small'}
        length={'full'}
        shape={'circle'}
      />
    </div>
  </div>
  {#key [targetEmployee, sourceEmployee]}
    {#if targetEmp && sourceEmp}
      <div class="flex-col flex-grow">
        <MergeComparer
          key="avatar"
          value={sourceEmp}
          {targetEmp}
          onChange={select}
          selected={update.avatar !== undefined}
        >
          <svelte:fragment slot="item" let:item>
            <Avatar avatar={item.avatar} size={'x-large'} icon={contact.icon.Person} />
          </svelte:fragment>
        </MergeComparer>
        <MergeComparer key="name" value={sourceEmp} {targetEmp} onChange={select} selected={update.name !== undefined}>
          <svelte:fragment slot="item" let:item>
            {getName(item)}
          </svelte:fragment>
        </MergeComparer>
        {#each objectAttributes as attribute}
          <MergeAttributeComparer
            key={attribute[0]}
            value={sourceEmp}
            {targetEmp}
            onChange={select}
            _class={contact.class.Employee}
            selected={toAny(update)[attribute[0]] !== undefined}
          />
        {/each}
        {#each mixins as mixin}
          {@const attributes = getMixinAttributes(mixin)}
          {#each attributes as attribute}
            <MergeAttributeComparer
              key={attribute}
              value={sourceEmp}
              {targetEmp}
              onChange={(key, value) => selectMixin(mixin, key, value)}
              _class={mixin}
              selected={toAny(mixinUpdate)?.[mixin]?.[attribute] !== undefined}
            />
          {/each}
        {/each}
        {#each Array.from(oldChannels).concat(targetChannels) as channel}
          {@const enabled = enabledChannels.get(channel._id) ?? true}
          <div class="flex-row-center flex-between">
            <ChannelPresenter value={channel} />
            <div class="flex-center">
              <Toggle
                on={enabled}
                on:change={(e) => {
                  enabledChannels.set(channel._id, e.detail)
                  enabledChannels = enabledChannels
                }}
              />
            </div>
          </div>
        {/each}
      </div>
      <div class="flex-col-center antiPopup p-4">
        <EditEmployee object={result} readonly channels={resultChannels} />
      </div>
    {/if}
  {/key}
</Card>
