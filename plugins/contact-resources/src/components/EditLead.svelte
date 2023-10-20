<!--
// Copyright © 2022, 2023 Hardcore Engineering Inc.
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
  import core, { Ref, Class, Doc, WithLookup, Mixin, ClassifierKind } from '@hcengineering/core'
  import { getClient, createQuery } from '@hcengineering/presentation'
  import lead, { Lead, Funnel } from '@hcengineering/lead'
  import setting, { settingId } from '@hcengineering/setting'
  import { Panel } from '@hcengineering/panel'
  import notification from '@hcengineering/notification'
  import {
    TabList,
    TabItem,
    EditBox,
    Grid,
    Button,
    IconMoreH,
    showPopup,
    getCurrentResolvedLocation,
    navigate,
    IconMixin
  } from '@hcengineering/ui'
  import {
    ContextMenu,
    UpDownNavigator,
    ObjectPresenter,
    DocAttributeBar,
    groupBy
  } from '@hcengineering/view-resources'
  import task, { State } from '@hcengineering/task'
  import { Channel } from '@hcengineering/contact'
  import view from '@hcengineering/view'
  import contact from '@hcengineering/contact'
  import { getResource } from '@hcengineering/platform'
  import LeadStateColumn from './LeadStateColumn.svelte'
  import { createEventDispatcher, onDestroy } from 'svelte'
  import plugin from '../plugin'

  export let _id: Ref<Lead>
  export let _class: Ref<Class<Lead>>
  export let embedded: boolean = false
  export let mode: string = 'messages'

  type NavEditLeadKey = 'mail' | 'messages' | 'notes' | 'activity'

  let lastId: Ref<Doc> = _id

  const queryClient = createQuery()
  const channelQuery = createQuery()
  const customerQuery = createQuery()

  const dispatch = createEventDispatcher()
  const client = getClient()
  const hierarchy = client.getHierarchy()

  let object: WithLookup<Lead> | undefined
  let customer: WithLookup<Doc> | undefined
  let title = ''
  let space: Funnel | undefined
  let statesIds: Ref<Doc>[] = []
  let states: Record<any, WithLookup<State>[]> = {}

  let innerWidth: number
  let showAllMixins: boolean
  let mixins: Mixin<Doc>[] = []

  const allowedCollections = ['labels']
  const ignoreKeys = ['isArchived']
  const ignoreMixins = new Set()

  const notificationClient = getResource(notification.function.GetNotificationClient).then((res) => res())

  $: read(_id)

  $: if (customer !== undefined) {
    getMixins(customer, true)
  }

  function getMixins (object: Doc, showAllMixins: boolean): void {
    if (object === undefined) return
    const descendants = hierarchy.getDescendants(core.class.Doc).map((p) => hierarchy.getClass(p))

    mixins = descendants.filter(
      (m) =>
        m.kind === ClassifierKind.MIXIN &&
        !ignoreMixins.has(m._id) &&
        (hierarchy.hasMixin(object, m._id) ||
          (showAllMixins &&
            hierarchy.isDerived(object._class, hierarchy.getBaseClass(m._id)) &&
            (m.extends && hierarchy.isMixin(m.extends) ? hierarchy.hasMixin(object, m.extends) : true)))
    )
  }

  function read (_id: Ref<Doc>) {
    if (lastId !== _id) {
      const prev = lastId
      lastId = _id
      notificationClient.then((client) => client.read(prev))
    }
  }

  onDestroy(async () => {
    notificationClient.then((client) => client.read(_id))
  })

  $: _id &&
    _class &&
    queryClient.query(
      _class,
      { _id },
      async (result) => {
        if (lastId !== _id) await save()
        ;[object] = result
        if (object) {
          title = object.title
          space = object.$lookup?.space
          statesIds = space?.states !== undefined ? space?.states : []
        }
      },
      { lookup: { space: lead.class.Funnel } }
    )

  $: if (object !== undefined) {
    customerQuery.query(object.attachedToClass, { _id: object.attachedTo }, async ([res]) => {
      if (!res) return
      customer = res
    })
  }

  $: fetchStates(statesIds)

  async function save () {
    if (!object) return
    const trimmedTitle = title.trim()
    if (trimmedTitle.length > 0 && trimmedTitle !== object.title?.trim()) {
      await client.update(object, { title: trimmedTitle })
    }
  }

  async function fetchStates (ids: any[]) {
    if (ids.length === 0) return
    try {
      const result = await client.findAll(task.class.State, { _id: { $in: Array.from(ids) } }, {})
      states = groupBy(result, '_id')
    } catch {}
  }

  let channel: Partial<Channel> = {}
  const activityOptions = { enabled: true, showInput: false }

  const handleViewModeChanged = (newMode: string) => {
    mode = newMode
  }

  $: if (object !== undefined) {
    channelQuery.query(contact.class.Channel, { attachedTo: object.attachedTo }, ([c]: Channel[]) => {
      if (c) channel = c
    })
  }

  let tabSource: { [index: string]: any } = {
    mail: { labelIntl: plugin.string.Mail, presenter: 'gmail:component:Main' },
    messages: { labelIntl: plugin.string.Messages, presenter: 'chunter:component:CommentPopup' }
    // issue: { labelIntl: plugin.string.Issue, presenter: 'task:component:' }
  }

  $: if (object?._id) {
    tabSource = {
      mail: {
        ...tabSource.mail,
        props: { channel }
      },
      messages: {
        ...tabSource.messages,
        props: { objectId: object._id, object, withInput: true, withHeader: false, fullWidth: true }
      }
    }
  }

  const modes: TabItem[] = Object.keys(tabSource).map((id: string) => ({ id, labelIntl: tabSource[id].labelIntl }))

  const resources: any = Object.keys(tabSource).reduce((a, c) => Object.assign(a, { [c as NavEditLeadKey]: null }), {})

  function fetchResources () {
    Object.keys(resources).forEach((key: string) =>
      Object.assign(resources, { [key]: getResource(tabSource[key].presenter) })
    )
  }

  $: fetchResources()

  let props: unknown

  $: if (tabSource[mode].props !== undefined) {
    props = tabSource[mode].props
  }

  let content: HTMLElement

  function change (field: string, value: unknown) {
    if (object === undefined) return
    client.updateDoc(object._class, object.space, object._id, { [field]: value })
  }

  function showMenu (ev?: Event): void {
    if (!object) return
    showPopup(ContextMenu, { object, excludedActions: [view.action.Open] }, (ev as MouseEvent).target as HTMLElement)
  }
  console.log($$props)
</script>

{#if object !== undefined}
  <Panel
    on:open
    {object}
    {embedded}
    bind:content
    isSub={false}
    isAside={true}
    isHeader={false}
    withoutTitle
    bind:innerWidth
    on:close={() => dispatch('close')}
    withoutActivity={!activityOptions.enabled}
    withoutInput={!activityOptions.showInput}
  >
    <svelte:fragment slot="navigator">
      {#if !embedded}
        <UpDownNavigator element={object} />
        <ObjectPresenter _class={object._class} objectId={object._id} value={object} />
        {#if space !== undefined}
          <ObjectPresenter _class={space._class} objectId={space._id} value={space} />
        {/if}
      {/if}
    </svelte:fragment>

    <div class="mt-3 container">
      {#each statesIds as ref (ref)}
        {#if Array.isArray(states[ref])}
          {@const [stateObject] = states[ref]}
          <LeadStateColumn object={stateObject} />
        {/if}
      {/each}
    </div>

    <Grid column={2} rowGap={1}>
      <EditBox
        focusable
        bind:value={title}
        kind={'large-style'}
        placeholder={lead.string.Lead}
        on:blur={() => {
          if (object !== undefined && title !== object.title) change('title', title)
        }}
      />
    </Grid>
    <div class="mt-3">
      <TabList items={modes} selected={mode} on:select={({ detail }) => handleViewModeChanged(detail.id)} />
    </div>
    <!-- render tab content in this conditon -->
    <div class="mt-3">
      {#if props !== undefined}
        {#await resources[mode]}
          ...
        {:then instance}
          <svelte:component this={instance} {...props} />
        {/await}
      {/if}
    </div>

    <svelte:fragment slot="utils">
      <Button icon={IconMoreH} kind={'ghost'} size={'medium'} on:click={showMenu} />
      <Button
        icon={setting.icon.Setting}
        kind={'ghost'}
        showTooltip={{ label: setting.string.ClassSetting }}
        on:click={(ev) => {
          ev.stopPropagation()
          const loc = getCurrentResolvedLocation()
          loc.path[2] = settingId
          loc.path[3] = 'setting'
          loc.path[4] = 'classes'
          loc.path.length = 5
          loc.query = { _class }
          loc.fragment = undefined
          navigate(loc)
        }}
      />
      <Button
        kind={'ghost'}
        icon={IconMixin}
        selected={showAllMixins}
        on:click={() => {
          showAllMixins = !showAllMixins
        }}
      />
    </svelte:fragment>
    <svelte:fragment slot="custom-attributes">
      {#if customer !== undefined}
        <DocAttributeBar
          {mixins}
          {ignoreKeys}
          object={customer}
          {allowedCollections}
          showLabel={plugin.string.LeadInfo}
        />
      {/if}
    </svelte:fragment>
  </Panel>
{/if}

<style lang="scss">
  .container {
    display: flex;
    justify-content: space-between;
    width: 100%;
  }
</style>
