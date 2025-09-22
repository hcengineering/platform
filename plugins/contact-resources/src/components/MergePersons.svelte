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
  /* eslint-disable @typescript-eslint/no-unused-vars */
  import { Analytics } from '@hcengineering/analytics'
  import { Channel, Person, SocialIdentity, getName } from '@hcengineering/contact'
  import core, {
    ArrOf,
    Doc,
    DocumentUpdate,
    Mixin,
    PersonUuid,
    Ref,
    RefTo,
    SocialIdType,
    Tx,
    TxOperations,
    TxProcessor
  } from '@hcengineering/core'
  import { Card, createQuery, getClient, updateAttribute } from '@hcengineering/presentation'
  import { Label, Spinner, Toggle } from '@hcengineering/ui'
  import { isCollectionAttr } from '@hcengineering/view-resources'
  import { createEventDispatcher } from 'svelte'

  import contact from '../plugin'
  import Avatar from './Avatar.svelte'
  import ChannelPresenter from './ChannelPresenter.svelte'
  import ChannelsDropdown from './ChannelsDropdown.svelte'
  import MergeAttributeComparer from './MergeAttributeComparer.svelte'
  import MergeComparer from './MergeComparer.svelte'
  import UserBox from './UserBox.svelte'
  import EditPerson from './EditPerson.svelte'
  import { getAccountClient } from '../utils'
  import SocialIdentityPresenter from './SocialIdentityPresenter.svelte'

  export let value: Person
  const dispatch = createEventDispatcher()
  const client = getClient()
  const hierarchy = client.getHierarchy()
  const accountClient = getAccountClient()
  const parent = hierarchy.getParentClass(contact.class.Person)
  const mixins = hierarchy.getDescendants(parent).filter((p) => hierarchy.isMixin(p))

  let sourcePersonRef = value._id
  let sourcePerson: Person | undefined = undefined

  let targetPersonRef: Ref<Person> | undefined = undefined
  let targetPerson: Person | undefined = undefined

  let loading = true

  const targetQuery = createQuery()
  $: targetPersonRef != null &&
    sourcePersonRef != null &&
    targetQuery.query(contact.class.Person, { _id: { $in: [sourcePersonRef, targetPersonRef] } }, (res) => {
      // ;[targetEmp] = res
      sourcePerson = res.find((it) => it._id === sourcePersonRef)
      targetPerson = res.find((it) => it._id === targetPersonRef)
      if (sourcePerson != null && targetPerson != null) {
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
    if (!canMergeGlobalPersons) return

    if (Object.keys(update).length > 0) {
      const _update = { ...update }
      if (_update.avatar !== undefined || sourcePerson.avatar === targetPerson.avatar) {
        // We replace avatar, we need to update source with target
        await client.update(sourcePerson, {
          avatar: sourcePerson.avatar === targetPerson.avatar ? null : targetPerson.avatar
        })
      }
      await client.update(targetPerson, _update)
    }
    const ops = client.apply()
    for (const channel of resultChannels.values()) {
      if (channel.attachedTo === targetPerson._id) continue
      await ops.update(channel, { attachedTo: targetPerson._id })
    }
    for (const old of oldChannels) {
      if (!(enabledChannels.get(old._id) ?? true)) {
        await ops.remove(old)
      }
    }

    for (const socialIdentity of resultSocialIdentities) {
      if (socialIdentity.attachedTo === targetPerson._id) continue
      await ops.update(socialIdentity, { attachedTo: targetPerson._id })
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
    await ops.commit()
    await updateAllRefs(client, sourcePerson, targetPerson)
    if (targetPerson.personUuid !== undefined && sourcePerson.personUuid !== undefined) {
      await accountClient.mergeSpecifiedPersons(targetPerson.personUuid, sourcePerson.personUuid)
    }

    dispatch('close')
  }

  function select (field: string, targetValue: boolean): void {
    if (!targetValue) {
      ;(update as any)[field] = (sourcePerson as any)[field]
    } else {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
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

  let enabledChannels = new Map<Ref<Channel>, boolean>()

  let resultChannels: Channel[] = []
  let oldChannels: Channel[] = []
  const valueChannelsQuery = createQuery()

  $: valueChannelsQuery.query(contact.class.Channel, { attachedTo: sourcePersonRef }, (res) => {
    oldChannels = res
  })

  let targetChannels: Channel[] = []
  const targetChannelsQuery = createQuery()
  $: targetPersonRef != null &&
    targetChannelsQuery.query(contact.class.Channel, { attachedTo: targetPersonRef }, (res) => {
      targetChannels = res
    })

  $: resultChannels = mergeChannels(oldChannels, targetChannels, enabledChannels)

  let sourceSocialIdentities: SocialIdentity[] = []
  const sourceSocialIdentitiesQuery = createQuery()
  $: sourcePersonRef != null &&
    sourceSocialIdentitiesQuery.query(contact.class.SocialIdentity, { attachedTo: sourcePersonRef }, (res) => {
      sourceSocialIdentities = res
    })

  let targetSocialIdentities: SocialIdentity[] = []
  const targetSocialIdentitiesQuery = createQuery()
  $: targetPersonRef != null &&
    targetSocialIdentitiesQuery.query(contact.class.SocialIdentity, { attachedTo: targetPersonRef }, (res) => {
      targetSocialIdentities = res
    })

  $: resultSocialIdentities = [...sourceSocialIdentities, ...targetSocialIdentities]
  $: visibleResultSocialIdentities = resultSocialIdentities.filter(
    (it) => it.type !== SocialIdType.HULY && it.type !== SocialIdType.HULY_ASSISTANT
  )

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

  function selectMixin (mixin: Ref<Mixin<Doc>>, field: string, targetValue: boolean): void {
    const upd = mixinUpdate[mixin] ?? {}
    if (!targetValue) {
      ;(upd as any)[field] = (sourcePerson as any)[mixin][field]
    } else {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete (upd as any)[field]
    }
    mixinUpdate[mixin] = upd
  }

  async function updateAllRefs (client: TxOperations, sourceAccount: Person, targetAccount: Person): Promise<Tx[]> {
    const h = client.getHierarchy()
    // Move all possible references to Employee and replace to target one.
    const ancestors = h.getAncestors(contact.class.Person)
    const reftos = (await client.findAll(core.class.Attribute, { 'type._class': core.class.RefTo })).filter((it) => {
      const to = it.type as RefTo<Doc>
      return h.getBaseClass(to.to) === contact.class.Person || ancestors.includes(to.to)
    })

    for (const attr of reftos) {
      if (attr.name === '_id') {
        continue
      }
      try {
        const descendants = h.getDescendants(attr.attributeOf)
        for (const d of descendants) {
          if (h.isDerived(d, core.class.Tx) || h.isDerived(d, core.class.BenchmarkDoc)) {
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
                await builder.commit()
              }
            }
          }
        }
      } catch (err: any) {
        Analytics.handleError(err)
      }
    }
    const arrs = (await client.findAll(core.class.Attribute, { 'type._class': core.class.ArrOf })).filter((it) => {
      const to = it.type as ArrOf<Doc>
      if (to.of._class !== core.class.RefTo) return false
      const refTo = to.of as RefTo<Doc>
      return h.getBaseClass(refTo.to) === contact.class.Person || ancestors.includes(refTo.to)
    })

    for (const attr of arrs) {
      if (attr.name === '_id') {
        continue
      }
      const descendants = h.getDescendants(attr.attributeOf)
      for (const d of descendants) {
        if (h.isDerived(d, core.class.Tx) || h.isDerived(d, core.class.BenchmarkDoc)) {
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
            await builder.commit()
          }
        }
      }
    }

    return []
  }

  let canMergeGlobalPersons = false
  let previousPrimaryUuid: PersonUuid | undefined
  let previousSecondaryUuid: PersonUuid | undefined
  $: if (targetPerson != null && sourcePerson != null) {
    void checkIfCanMergeGlobalPersons(targetPerson, sourcePerson)
  }

  async function checkIfCanMergeGlobalPersons (primaryPerson: Person, secondaryPerson: Person): Promise<void> {
    if (primaryPerson === undefined || secondaryPerson === undefined) {
      return
    }

    if (primaryPerson.personUuid === previousPrimaryUuid && secondaryPerson.personUuid === previousSecondaryUuid) {
      return
    }

    previousPrimaryUuid = primaryPerson.personUuid
    previousSecondaryUuid = secondaryPerson.personUuid

    if (primaryPerson.personUuid === undefined || secondaryPerson.personUuid === undefined) {
      canMergeGlobalPersons = true
      loading = false
      return
    }

    loading = true
    canMergeGlobalPersons = await accountClient.canMergeSpecifiedPersons(
      primaryPerson.personUuid,
      secondaryPerson.personUuid
    )
    loading = false
  }

  $: canSave = targetPerson !== undefined && !loading && canMergeGlobalPersons
</script>

<Card
  label={contact.string.MergePersons}
  okLabel={contact.string.MergePersons}
  fullSize
  okAction={merge}
  {canSave}
  onCancel={() => dispatch('close')}
  on:changeContent
>
  <div class="flex-row flex-between">
    <div class="flex-row-center flex-gap-2">
      <UserBox
        _class={contact.class.Person}
        showNavigate={false}
        label={contact.string.MergePersonsFrom}
        docQuery={{}}
        filter={(it) => !hierarchy.hasMixin(it, contact.mixin.Employee)}
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
    <span class="mx-4">&gt;&gt;</span>
    <div class="flex-row-center flex-gap-2">
      <UserBox
        _class={contact.class.Person}
        showNavigate={false}
        label={contact.string.MergePersonsTo}
        docQuery={{ _id: { $ne: sourcePersonRef } }}
        bind:value={targetPersonRef}
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
  {#key [targetPersonRef, sourcePersonRef]}
    {#if targetPerson != null && sourcePerson != null}
      <div class="flex-col flex-grow mt-4">
        <MergeComparer
          key="avatar"
          value={sourcePerson}
          targetEmp={targetPerson}
          onChange={select}
          selected={update.avatar !== undefined}
        >
          <svelte:fragment slot="item" let:item>
            <Avatar person={item} size={'x-large'} icon={contact.icon.Person} name={item.name} />
          </svelte:fragment>
        </MergeComparer>
        <MergeComparer key="name" value={sourcePerson} targetEmp={targetPerson} onChange={select} selected>
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
            selected
          />
        {/each}
        {#each mixins as mixin}
          {@const attributes = getMixinAttributes(mixin)}
          {#each attributes as attribute}
            <MergeAttributeComparer
              key={attribute}
              value={sourcePerson}
              targetEmp={targetPerson}
              onChange={(key, value) => {
                selectMixin(mixin, key, value)
              }}
              _class={mixin}
              selected
            />
          {/each}
        {/each}
        {#each Array.from(oldChannels).concat(targetChannels) as channel}
          {@const enabled = enabledChannels.get(channel._id) ?? true}
          <div class="flex-row-center flex-between mt-2">
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
      <div class="flex-col-center antiPopup p-4 mt-4">
        <EditPerson object={result} readonly channels={resultChannels} />
      </div>
    {/if}
  {/key}
  {#if targetPersonRef != null}
    <div class="mt-4">
      {#if loading}
        <Spinner size="medium" />
      {:else if !canMergeGlobalPersons}
        <span class="error"><Label label={contact.string.CannotMerge} /></span>
      {:else if visibleResultSocialIdentities.length > 0}
        <span class="label"><Label label={contact.string.SocialIds} /></span>
        {#each visibleResultSocialIdentities as socialIdentity}
          <div class="mt-2">
            <SocialIdentityPresenter value={socialIdentity} />
          </div>
        {/each}
      {/if}
    </div>
  {/if}
</Card>

<style lang="scss">
  .error {
    color: var(--theme-error-color);
  }
</style>
