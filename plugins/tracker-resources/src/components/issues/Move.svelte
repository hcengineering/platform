<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021, 2023 Hardcore Engineering Inc.
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
  import { getClient } from '@hcengineering/presentation'
  import { Button, Label, Status as StatusControl } from '@hcengineering/ui'

  import core, { Class, Client, Doc, Ref, SortingOrder } from '@hcengineering/core'
  import { getResource, OK, Resource, Status, translate } from '@hcengineering/platform'
  import { SpaceSelect } from '@hcengineering/presentation'
  import { calcRank } from '@hcengineering/task'
  import { createEventDispatcher } from 'svelte'
  import view from '@hcengineering/view'
  import tracker from '../../plugin'
  import { Issue, Project } from '@hcengineering/tracker'
  import { moveIssueToSpace } from '../../utils'

  export let selected: Issue | Issue[]
  $: docs = Array.isArray(selected) ? selected : [selected]

  let status: Status = OK
  let currentSpace: Project | undefined
  const client = getClient()
  const dispatch = createEventDispatcher()
  const hierarchy = client.getHierarchy()
  let label = ''
  let space: Ref<Project>

  $: _class = currentSpace ? hierarchy.getClass(currentSpace._class).label : undefined
  let classLabel = ''
  $: {
    const doc = docs[0]
    if (space === undefined) space = doc.space
    translate(hierarchy.getClass(doc._class).label, {}).then((res) => (label = res.toLocaleLowerCase()))
  }
  $: _class && translate(_class, {}).then((res) => (classLabel = res.toLocaleLowerCase()))

  async function move (doc: Issue): Promise<void> {
    const spaceObject = await client.findOne(tracker.class.Project, { _id: space })
    if (spaceObject === undefined) {
      throw new Error('Move: state not found')
    }
    const lastOne = await client.findOne(tracker.class.Issue, {}, { sort: { rank: SortingOrder.Descending } })
    const incResult = await client.updateDoc(
      tracker.class.Project,
      core.space.Space,
      space,
      {
        $inc: { sequence: 1 }
      },
      true
    )
    await moveIssueToSpace(client, doc, space, {
      status: spaceObject.defaultIssueStatus,
      rank: calcRank(lastOne, undefined),
      number: (incResult as any).object.sequence
    })

    dispatch('close')
  }

  const moveAll = async () => {
    docs.forEach(async (doc) => await move(doc))
  }

  async function getSpace (): Promise<void> {
    client.findOne(tracker.class.Project, { _id: space }).then((res) => (currentSpace = res))
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
</script>

<div class="container">
  <div class="overflow-label fs-title">
    <Label label={view.string.MoveClass} params={{ class: label }} />
  </div>
  <StatusControl {status} />
  <div class="content-accent-color mt-4 mb-4">
    <Label label={view.string.SelectToMove} params={{ class: label, classLabel }} />
  </div>
  <div class="spaceSelect">
    {#await getSpace() then}
      {#if currentSpace && _class}
        <SpaceSelect _class={currentSpace._class} label={_class} bind:value={space} />
      {/if}
    {/await}
  </div>
  <div class="footer">
    <Button
      label={view.string.Move}
      size={'small'}
      disabled={space === currentSpace?._id || status !== OK}
      kind={'primary'}
      on:click={moveAll}
    />
    <Button
      size={'small'}
      label={view.string.Cancel}
      on:click={() => {
        dispatch('close')
      }}
    />
  </div>
</div>

<style lang="scss">
  .container {
    display: flex;
    flex-direction: column;
    padding: 2rem 1.75rem 1.75rem;
    width: 25rem;
    max-width: 40rem;
    background: var(--popup-bg-color);
    border-radius: 1.25rem;
    user-select: none;
    box-shadow: var(--popup-shadow);

    .spaceSelect {
      padding: 0.75rem;
      background-color: var(--body-color);
      border: 1px solid var(--popup-divider);
      border-radius: 0.75rem;
    }

    .footer {
      flex-shrink: 0;
      display: grid;
      grid-auto-flow: column;
      direction: rtl;
      justify-content: start;
      align-items: center;
      margin-top: 1rem;
      column-gap: 0.5rem;
    }
  }
</style>
