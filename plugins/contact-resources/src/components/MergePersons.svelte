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
  import { Channel, Person, getName } from '@hcengineering/contact'
  import core, { Doc, DocumentUpdate, Mixin, Ref, RefTo, Tx, TxOperations, TxProcessor } from '@hcengineering/core'
  import { Card, createQuery, getClient, updateAttribute } from '@hcengineering/presentation'
  import { Toggle } from '@hcengineering/ui'
  import { isCollectionAttr } from '@hcengineering/view-resources'
  import { createEventDispatcher } from 'svelte'
  import contact from '../plugin'
  import Avatar from './Avatar.svelte'
  import ChannelPresenter from './ChannelPresenter.svelte'
  import ChannelsDropdown from './ChannelsDropdown.svelte'
  import EditEmployee from './EditEmployee.svelte'
  import MergeAttributeComparer from './MergeAttributeComparer.svelte'
  import MergeComparer from './MergeComparer.svelte'
  import UserBox from './UserBox.svelte'

  export let value: Person
  const dispatch = createEventDispatcher()
  const client = getClient()
  const hierarchy = client.getHierarchy()
  const parent = hierarchy.getParentClass(contact.class.Person)
  const mixins = hierarchy.getDescendants(parent).filter((p) => hierarchy.isMixin(p))

  let sourcePersonRef = value._id
  let sourcePerson: Person | undefined = undefined

  let targetPersonRf: Ref<Person> | undefined = undefined
  let targetPerson: Person | undefined = undefined

  const targetQuery = createQuery()
  $: targetPersonRf &&
    sourcePersonRef &&
    targetQuery.query(contact.class.Person, { _id: { $in: [sourcePersonRef, targetPersonRf] } }, (res) => {
      // ;[targetEmp] = res
      sourcePerson = res.find((it) => it._id === sourcePersonRef)
      targetPerson = res.find((it) => it._id === targetPersonRf)
      if (sourcePerson && targetPerson) {
        update = fillUpdate(sourcePerson, targetPerson)
        mixinUpdate = fillMixinUpdate(sourcePerson, targetPerson)
        applyUpdate(update)
      }
    })

  function fillUpdate (source: Person, target: Person): DocumentUpdate<Person> {
    const res: DocumentUpdate<Person> = {}
    const attributes = hierarchy.getOwnAttributes(contact.class.Person)
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

  function fillMixinUpdate (source: Person, target: Person): Record<Ref<Mixin<Doc>>, DocumentUpdate<Doc>> {
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

  let update: DocumentUpdate<Person> = {}
  let mixinUpdate: Record<Ref<Mixin<Doc>>, DocumentUpdate<Doc>> = {}

  let result: Person = { ...value }

  function applyUpdate (update: DocumentUpdate<Person>): void {
    const r = hierarchy.clone(targetPerson)
    TxProcessor.applyUpdate(r, update)
    result = r
  }

  async function merge (): Promise<void> {
    if (sourcePerson === undefined || targetPerson === undefined) return
    if (Object.keys(update).length > 0) {
      if (update.avatar !== undefined || sourcePerson.avatar === targetPerson.avatar) {
        // We replace avatar, we need to update source with target
        await client.update(sourcePerson, {
          avatar: sourcePerson.avatar === targetPerson.avatar ? '' : targetPerson.avatar
        })
      }
      await client.update(targetPerson, update)
    }
    for (const channel of resultChannels.values()) {
      if (channel.attachedTo === targetPerson._id) continue
      await client.update(channel, { attachedTo: targetPerson._id })
    }
    for (const old of oldChannels) {
      if ((enabledChannels.get(old._id) ?? true) === false) {
        await client.remove(old)
      }
    }
    for (const mixin in mixinUpdate) {
      const attrs = (mixinUpdate as any)[mixin]
      if (Object.keys(attrs).length > 0) {
        await client.updateMixin(
          targetPerson._id,
          targetPerson._class,
          targetPerson.space,
          mixin as Ref<Mixin<Doc>>,
          attrs
        )
      } else if (!hierarchy.hasMixin(targetPerson, mixin as Ref<Mixin<Doc>>)) {
        await client.createMixin(
          targetPerson._id,
          targetPerson._class,
          targetPerson.space,
          mixin as Ref<Mixin<Doc>>,
          {}
        )
      }
    }
    await updateAllRefs(client, sourcePerson, targetPerson)

    dispatch('close')
  }

  function select (field: string, targetValue: boolean) {
    if (!targetValue) {
      ;(update as any)[field] = (sourcePerson as any)[field]
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

  $: valueChannelsQuery.query(contact.class.Channel, { attachedTo: sourcePersonRef }, (res) => {
    oldChannels = res
  })

  let targetChannels: Channel[] = []
  const targetChannelsQuery = createQuery()
  $: targetPersonRf &&
    targetChannelsQuery.query(contact.class.Channel, { attachedTo: targetPersonRf }, (res) => {
      targetChannels = res
    })

  $: resultChannels = mergeChannels(oldChannels, targetChannels, enabledChannels)

  const attributes = hierarchy.getAllAttributes(contact.mixin.Employee, core.class.Doc)
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

  async function updateAllRefs (client: TxOperations, sourceAccount: Person, targetAccount: Person): Promise<Tx[]> {
    const accounts = await client.findAll(contact.class.PersonAccount, { person: sourceAccount._id })

    const h = client.getHierarchy()
    console.log('merge employee:', sourceAccount.name, 'to', targetAccount.name)
    // Move all possible references to Account and Employee and replace to target one.
    const reftos = (await client.findAll(core.class.Attribute, { 'type._class': core.class.RefTo })).filter((it) => {
      const to = it.type as RefTo<Doc>
      return (
        to.to === contact.class.Person ||
        to.to === contact.mixin.Employee ||
        to.to === core.class.Account ||
        to.to === contact.class.PersonAccount
      )
    })

    for (const attr of reftos) {
      if (attr.name === '_id') {
        continue
      }
      const to = attr.type as RefTo<Doc>
      if (to.to === contact.mixin.Employee || to.to === contact.class.Person) {
        const descendants = h.getDescendants(attr.attributeOf)
        for (const d of descendants) {
          if (h.isDerived(d, core.class.Tx)) {
            continue
          }
          if (h.findDomain(d) !== undefined) {
            while (true) {
              const values = await client.findAll(d, { [attr.name]: sourceAccount._id }, { limit: 100 })
              if (values.length === 0) {
                break
              }

              const builder = client.apply(sourceAccount._id)
              for (const v of values) {
                await updateAttribute(builder, v, d, { key: attr.name, attr }, targetAccount._id)
              }
              if (builder.txes.length > 0) {
                console.log('merge employee:', sourceAccount.name, 'to', targetAccount.name, d, builder.txes.length)
                await builder.commit()
              }
            }
          }
        }
      }
    }
    const arrs = await client.findAll(core.class.Attribute, { 'type._class': core.class.ArrOf })
    for (const attr of arrs) {
      if (attr.name === '_id') {
        continue
      }
      const to = attr.type as RefTo<Doc>
      if (to.to === contact.mixin.Employee || to.to === contact.class.Person) {
        const descendants = h.getDescendants(attr.attributeOf)
        for (const d of descendants) {
          if (h.isDerived(d, core.class.Tx)) {
            continue
          }
          if (h.findDomain(d) !== undefined) {
            while (true) {
              const values = await client.findAll(attr.attributeOf, { [attr.name]: sourceAccount._id }, { limit: 100 })
              if (values.length === 0) {
                break
              }
              const builder = client.apply(sourceAccount._id)
              for (const v of values) {
                await updateAttribute(builder, v, d, { key: attr.name, attr }, targetAccount._id)
              }
              console.log('merge employee:', sourceAccount.name, 'to', targetAccount.name, d, builder.txes.length)
              await builder.commit()
            }
          }
        }
      }
    }

    await client.remove(sourceAccount)
    for (const account of accounts) {
      await client.update(account, { person: targetAccount._id })
    }
    return []
  }

  const toAny = (a: any) => a
</script>

<Card
  label={contact.string.MergePersons}
  okLabel={contact.string.MergePersons}
  fullSize
  okAction={merge}
  canSave={targetPerson !== undefined}
  onCancel={() => dispatch('close')}
  on:changeContent
>
  <div class="flex-row flex-between">
    <div class="flex-row-center">
      <UserBox
        _class={contact.class.Person}
        showNavigate={false}
        label={contact.string.MergePersonsFrom}
        docQuery={{}}
        bind:value={sourcePersonRef}
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
      <UserBox
        _class={contact.class.Person}
        showNavigate={false}
        label={contact.string.MergePersonsTo}
        docQuery={{ _id: { $ne: sourcePersonRef } }}
        bind:value={targetPersonRf}
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
  {#key [targetPersonRf, sourcePersonRef]}
    {#if targetPerson && sourcePerson}
      <div class="flex-col flex-grow">
        <MergeComparer
          key="avatar"
          value={sourcePerson}
          targetEmp={targetPerson}
          onChange={select}
          selected={update.avatar !== undefined}
        >
          <svelte:fragment slot="item" let:item>
            <Avatar avatar={item.avatar} size={'x-large'} icon={contact.icon.Person} name={item.name} />
          </svelte:fragment>
        </MergeComparer>
        <MergeComparer
          key="name"
          value={sourcePerson}
          targetEmp={targetPerson}
          onChange={select}
          selected={update.name !== undefined}
        >
          <svelte:fragment slot="item" let:item>
            {getName(client.getHierarchy(), item)}
          </svelte:fragment>
        </MergeComparer>
        {#each objectAttributes as attribute}
          <MergeAttributeComparer
            key={attribute[0]}
            value={sourcePerson}
            targetEmp={targetPerson}
            onChange={select}
            _class={contact.mixin.Employee}
            selected={toAny(update)[attribute[0]] !== undefined}
          />
        {/each}
        {#each mixins as mixin}
          {@const attributes = getMixinAttributes(mixin)}
          {#each attributes as attribute}
            <MergeAttributeComparer
              key={attribute}
              value={sourcePerson}
              targetEmp={targetPerson}
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
