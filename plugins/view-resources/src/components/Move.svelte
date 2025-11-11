<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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
  import { SpaceSelect, getClient, Card } from '@hcengineering/presentation'
  import { Label, Status as StatusControl, themeStore } from '@hcengineering/ui'

  import core, { Class, Client, Doc, Ref, SortingOrder, Space } from '@hcengineering/core'
  import { OK, Resource, Severity, Status, getResource, translate } from '@hcengineering/platform'
  import task, { Project, Task, makeRank } from '@hcengineering/task'
  import { createEventDispatcher } from 'svelte'
  import view from '../plugin'
  import { moveToSpace } from '../utils'

  export let selected: Doc | Doc[]
  $: docs = Array.isArray(selected) ? selected : [selected]

  let status: Status = OK
  let currentSpace: Space | undefined
  const client = getClient()
  const dispatch = createEventDispatcher()
  const hierarchy = client.getHierarchy()
  let label = ''
  let space: Ref<Space>

  $: _class = currentSpace ? hierarchy.getClass(currentSpace._class).label : undefined
  let classLabel = ''
  $: {
    const doc = docs[0]
    if (space === undefined) space = doc.space
    translate(hierarchy.getClass(doc._class).label, {}, $themeStore.language).then(
      (res) => (label = res.toLocaleLowerCase())
    )
  }
  $: _class && translate(_class, {}, $themeStore.language).then((res) => (classLabel = res.toLocaleLowerCase()))

  async function move (doc: Doc): Promise<void> {
    const op = client.apply(undefined, 'move-to-space')
    const needRank = currentSpace ? hierarchy.isDerived(currentSpace._class, task.class.Project) : false
    if (needRank) {
      const lastOne = await client.findOne((doc as Task)._class, { space }, { sort: { rank: SortingOrder.Descending } })
      await moveToSpace(op, doc, space, {
        rank: makeRank(lastOne?.rank, undefined)
      })
    } else {
      await moveToSpace(op, doc, space)
    }
    await op.commit()
  }

  const moveAll = async (): Promise<void> => {
    for (const doc of docs) {
      try {
        await move(doc)
      } catch (err) {
        console.error(err)
      }
    }
    dispatch('close')
  }

  async function getSpace (): Promise<Space | undefined> {
    return await client.findOne(core.class.Space, { _id: space }).then((res) => (currentSpace = res))
  }

  async function invokeValidate (
    doc: Doc,
    action: Resource<<T extends Doc>(doc: T, client: Client) => Promise<Status>>
  ): Promise<Status> {
    const impl = await getResource(action)
    return await impl(doc, client)
  }

  async function validate (doc: Doc, _class: Ref<Class<Doc>>): Promise<void> {
    const clazz = hierarchy.getClass(_class)
    const validatorMixin = hierarchy.as(clazz, view.mixin.ObjectValidator)
    if (validatorMixin?.validator != null) {
      status = await invokeValidate(doc, validatorMixin.validator)
    } else if (clazz.extends != null) {
      await validate(doc, clazz.extends)
    } else {
      status = OK
    }
  }

  $: {
    docs.forEach((doc) => {
      validate(doc, doc._class)
    })
  }

  $: spaceQuery =
    currentSpace && hierarchy.isDerived(currentSpace._class, task.class.Project)
      ? { type: (currentSpace as Project).type, archived: false }
      : { archived: false }
</script>

<Card
  label={view.string.MoveClass}
  okLabel={view.string.Move}
  canSave={space !== currentSpace?._id && status === OK}
  okAction={moveAll}
  width={'small'}
  labelProps={{ class: label }}
  on:close
>
  <div class="container">
    {#if status.severity !== Severity.OK}
      <StatusControl {status} />
    {/if}
    <div class="caption-color mt-4 mb-4">
      <Label label={view.string.SelectToMove} params={{ class: label, classLabel }} />
    </div>
    <div class="spaceSelect">
      {#await getSpace() then}
        {#if currentSpace && _class}
          <SpaceSelect {spaceQuery} _class={currentSpace._class} label={_class} bind:value={space} />
        {/if}
      {/await}
    </div>
  </div>
</Card>

<style lang="scss">
  .container {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    width: 100%;
  }
</style>
