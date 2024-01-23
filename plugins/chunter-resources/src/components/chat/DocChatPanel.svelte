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
  import { Doc, Mixin, Ref, SortingOrder } from '@hcengineering/core'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { ActionIcon, getCurrentResolvedLocation, Label, navigate } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import { DocAttributeBar, DocNavLink, getDocLinkTitle, getDocMixins, openDoc } from '@hcengineering/view-resources'
  import { getResource } from '@hcengineering/platform'
  import { SpecialElement } from '@hcengineering/workbench-resources'
  import activity, { ActivityMessage, ActivityMessagesFilter } from '@hcengineering/activity'
  import { combineActivityMessages } from '@hcengineering/activity-resources'

  import chunter from '../../plugin'

  export let object: Doc
  export let filterId: Ref<ActivityMessagesFilter> = activity.ids.AllFilter

  const client = getClient()
  const hierarchy = client.getHierarchy()
  const activityMessagesQuery = createQuery()

  $: clazz = hierarchy.getClass(object._class)
  $: objectChatPanel = hierarchy.classHierarchyMixin(object._class, chunter.mixin.ObjectChatPanel)

  let mixins: Array<Mixin<Doc>> = []
  let linkTitle: string | undefined = undefined

  let activityMessages: ActivityMessage[] = []
  let filters: ActivityMessagesFilter[] = []

  $: mixins = getDocMixins(object)

  $: getDocLinkTitle(client, object._id, object._class, object).then((res) => {
    linkTitle = res
  })

  $: activityMessagesQuery.query(activity.class.ActivityMessage, { attachedTo: object._id }, (res) => {
    activityMessages = combineActivityMessages(res)
  })

  client
    .findAll(activity.class.ActivityMessagesFilter, {}, { sort: { position: SortingOrder.Ascending } })
    .then((res) => {
      filters = res
    })

  function handleFilterSelected (filter: ActivityMessagesFilter) {
    const loc = getCurrentResolvedLocation()
    loc.query = { filter: filter._id }
    navigate(loc)
  }

  async function getMessagesCount (
    filter: ActivityMessagesFilter,
    activityMessages: ActivityMessage[]
  ): Promise<number> {
    if (filter._id === activity.ids.AllFilter) {
      return activityMessages.length
    }

    const filterFn = await getResource(filter.filter)
    const filteredMessages = activityMessages.filter((message) => filterFn(message, object._class))

    return filteredMessages.length
  }
</script>

<div class="actions">
  <ActionIcon
    icon={view.icon.Open}
    size="medium"
    action={() => {
      openDoc(client.getHierarchy(), object)
    }}
  />
</div>

<div class="header">
  <div class="identifier">
    <Label label={clazz.label} />
    {#if linkTitle}
      •
      <DocNavLink {object}>
        {linkTitle}
      </DocNavLink>
    {/if}
  </div>
  {#if objectChatPanel}
    {#await getResource(objectChatPanel.titleProvider) then getTitle}
      <div class="title overflow-label">
        {getTitle(object)}
      </div>
    {/await}
  {/if}
</div>

<DocAttributeBar {object} {mixins} ignoreKeys={objectChatPanel?.ignoreKeys ?? []} showHeader={false} />

{#each filters as filter}
  {#key filter._id}
    {#await getMessagesCount(filter, activityMessages) then count}
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <!-- svelte-ignore a11y-no-static-element-interactions -->
      {#if filter._id === activity.ids.AllFilter || count > 0}
        <div
          on:click={() => {
            handleFilterSelected(filter)
          }}
        >
          <SpecialElement label={filter.label} selected={filterId === filter._id} notifications={count} />
        </div>
      {/if}
    {/await}
  {/key}
{/each}

<style lang="scss">
  .header {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    flex-shrink: 0;
    margin: 0.75rem;
    padding: 0 0.75rem;
    color: var(--theme-content-color);
    margin-bottom: 0;
  }

  .identifier {
    display: flex;
    gap: 0.25rem;
    color: var(--theme-halfcontent-color);
    font-size: 0.75rem;
  }

  .title {
    font-weight: 500;
    font-size: 1.125rem;
  }

  .actions {
    display: flex;
    justify-content: end;
    margin: 0.75rem;
    padding: 0 0.75rem;
    margin-bottom: 0;
  }
</style>
