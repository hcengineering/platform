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
  import { AttachmentStyleBoxCollabEditor } from '@hcengineering/attachment-resources'
  import core, { ClassifierKind, Data, Doc, Mixin, Ref } from '@hcengineering/core'
  import notification from '@hcengineering/notification'
  import { Panel } from '@hcengineering/panel'
  import { getResource } from '@hcengineering/platform'
  import presentation, { createQuery, getClient } from '@hcengineering/presentation'
  import { Vacancy } from '@hcengineering/recruit'
  import tracker from '@hcengineering/tracker'
  import view from '@hcengineering/view'
  import { Button, Component, EditBox, IconMixin, IconMoreH, Label, showPopup } from '@hcengineering/ui'
  import { ContextMenu, DocAttributeBar, DocNavLink } from '@hcengineering/view-resources'
  import { createEventDispatcher, onDestroy } from 'svelte'
  import recruit from '../plugin'
  import VacancyApplications from './VacancyApplications.svelte'

  export let _id: Ref<Vacancy>
  export let embedded: boolean = false

  let object: Required<Vacancy>
  let rawName: string = ''
  let rawDesc: string = ''
  let rawFullDesc: string = ''
  let lastId: Ref<Vacancy> | undefined = undefined

  let showAllMixins = false

  const dispatch = createEventDispatcher()
  const notificationClient = getResource(notification.function.GetNotificationClient).then((res) => res())

  onDestroy(async () => {
    void notificationClient.then((client) => client.read(_id))
  })

  const client = getClient()

  const query = createQuery()
  // const clazz = client.getHierarchy().getClass(recruit.class.Vacancy)

  function updateObject (_id: Ref<Vacancy>): void {
    if (lastId !== _id) {
      const prev = lastId
      lastId = _id
      if (prev !== undefined) {
        void notificationClient.then((client) => client.read(prev))
      }
      query.query(recruit.class.Vacancy, { _id }, (result) => {
        object = result[0] as Required<Vacancy>
        rawName = object.name
        rawDesc = object.description
        rawFullDesc = object.fullDescription
      })
    }
  }

  $: updateObject(_id)

  function showMenu (ev?: Event): void {
    if (object !== undefined) {
      showPopup(ContextMenu, { object, excludedActions: [view.action.Open] }, (ev as MouseEvent).target as HTMLElement)
    }
  }

  const ignoreMixins: Set<Ref<Mixin<Doc>>> = new Set<Ref<Mixin<Doc>>>()
  const hierarchy = client.getHierarchy()
  let mixins: Mixin<Doc>[] = []

  function getMixins (object: Doc, showAllMixins: boolean): void {
    if (object === undefined) return
    const descendants = hierarchy.getDescendants(core.class.Doc).map((p) => hierarchy.getClass(p))

    mixins = descendants.filter(
      (m) =>
        m.kind === ClassifierKind.MIXIN &&
        !ignoreMixins.has(m._id) &&
        (hierarchy.hasMixin(object, m._id) ||
          (showAllMixins && hierarchy.isDerived(object._class, hierarchy.getBaseClass(m._id))))
    )
  }

  $: getMixins(object, showAllMixins)

  let descriptionBox: AttachmentStyleBoxCollabEditor
  $: descriptionKey = client.getHierarchy().getAttribute(recruit.class.Vacancy, 'fullDescription')
  let saved = false
  async function save (): Promise<void> {
    if (object === undefined) {
      return
    }

    const updates: Partial<Data<Vacancy>> = {}
    const trimmedName = rawName.trim()

    if (trimmedName.length > 0 && trimmedName !== object.name?.trim()) {
      updates.name = trimmedName
    }

    if (rawDesc !== object.description) {
      updates.description = rawDesc
    }
    if (rawFullDesc !== object.fullDescription) {
      updates.fullDescription = rawFullDesc
    }

    if (Object.keys(updates).length > 0) {
      await client.update(object, updates)
    }
  }
</script>

{#if object}
  <Panel
    isHeader={false}
    isSub={false}
    isAside={true}
    {embedded}
    {object}
    on:open
    on:close={() => {
      dispatch('close')
    }}
  >
    <svelte:fragment slot="title">
      <DocNavLink noUnderline {object}>
        <div class="title">{object.name}</div>
      </DocNavLink>
    </svelte:fragment>

    <svelte:fragment slot="attributes" let:direction={dir}>
      {#if dir === 'column'}
        <DocAttributeBar {object} {mixins} ignoreKeys={['name', 'fullDescription', 'private', 'archived']} />
      {/if}
    </svelte:fragment>

    <span class="fs-title flex-grow">
      <EditBox
        bind:value={rawName}
        placeholder={recruit.string.VacancyPlaceholder}
        kind={'large-style'}
        focusable
        autoFocus={!embedded}
        on:blur={save}
      />
    </span>

    <svelte:fragment slot="pre-utils">
      {#if saved}
        <Label label={presentation.string.Saved} />
      {/if}
    </svelte:fragment>
    <svelte:fragment slot="utils">
      <Button icon={IconMoreH} iconProps={{ size: 'medium' }} kind={'icon'} on:click={showMenu} />
      <Button
        icon={IconMixin}
        kind={'icon'}
        iconProps={{ size: 'medium' }}
        selected={showAllMixins}
        on:click={() => {
          showAllMixins = !showAllMixins
        }}
      />
    </svelte:fragment>

    <!-- <EditBox bind:value={object.description} placeholder={recruit.string.VacancyDescription} focusable on:blur={save} /> -->
    <div class="w-full mt-6">
      <AttachmentStyleBoxCollabEditor
        focusIndex={30}
        {object}
        key={{ key: 'fullDescription', attr: descriptionKey }}
        bind:this={descriptionBox}
        placeholder={recruit.string.FullDescription}
        on:saved={(evt) => {
          saved = evt.detail
        }}
      />
    </div>

    <div class="w-full mt-6">
      <VacancyApplications objectId={object._id} />
    </div>
    <div class="w-full mt-6">
      <Component is={tracker.component.RelatedIssuesSection} props={{ object, label: tracker.string.RelatedIssues }} />
    </div>
  </Panel>
{/if}
