<!--
// Copyright © 2022 Hardcore Engineering Inc.
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
  import { Class, Doc, DocumentQuery, Ref, Space, WithLookup } from '@hcengineering/core'
  import { Asset, IntlString } from '@hcengineering/platform'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import {
    AnyComponent,
    Button,
    Component,
    deviceOptionsStore as deviceInfo,
    Icon,
    IconAdd,
    Label,
    Loading,
    SearchEdit,
    showPopup
  } from '@hcengineering/ui'
  import view, { Viewlet, ViewletDescriptor, ViewletPreference } from '@hcengineering/view'
  import {
    FilterBar,
    FilterButton,
    getViewOptions,
    setActiveViewletId,
    ViewletSettingButton
  } from '@hcengineering/view-resources'

  export let _class: Ref<Class<Doc>>
  export let space: Ref<Space> | undefined = undefined
  export let icon: Asset
  export let label: IntlString
  export let createLabel: IntlString | undefined
  export let createComponent: AnyComponent | undefined
  export let createComponentProps: Record<string, any> = {}
  export let descriptor: Ref<ViewletDescriptor> | undefined = undefined
  export let baseQuery: DocumentQuery<Doc> = {}

  let search = ''
  let viewlet: WithLookup<Viewlet> | undefined

  $: query = baseQuery || {}

  $: searchQuery = search === '' ? query : { $search: search, ...query }

  $: resultQuery = searchQuery

  const preferenceQuery = createQuery()
  let preference: ViewletPreference | undefined

  const client = getClient()
  let loading = true
  $: updateDescriptor(_class, descriptor)

  function updateDescriptor (_class: Ref<Class<Doc>>, descriptor: Ref<ViewletDescriptor> = view.viewlet.Table) {
    loading = true
    client
      .findOne<Viewlet>(
        view.class.Viewlet,
        {
          attachTo: _class,
          descriptor
        },
        { lookup: { descriptor: view.class.ViewletDescriptor } }
      )
      .then((res) => {
        viewlet = res
        if (res !== undefined) {
          setActiveViewletId(res._id)
          preferenceQuery.query(
            view.class.ViewletPreference,
            {
              attachedTo: res._id
            },
            (res) => {
              preference = res[0]
              loading = false
            },
            { limit: 1 }
          )
        }
      })
  }

  function showCreateDialog () {
    if (createComponent === undefined) return
    showPopup(createComponent, createComponentProps, 'top')
  }

  $: twoRows = $deviceInfo.twoRows

  $: viewOptions = getViewOptions(viewlet)
</script>

<div class="ac-header withSettings" class:full={!twoRows} class:mini={twoRows}>
  <div class:ac-header-full={!twoRows} class:flex-between={twoRows}>
    <div class="ac-header__wrap-title mr-3">
      <span class="ac-header__icon"><Icon {icon} size={'small'} /></span>
      <span class="ac-header__title"><Label {label} /></span>
      <div class="ml-4"><FilterButton {_class} /></div>
    </div>

    <SearchEdit bind:value={search} />
  </div>
  <div class="ac-header-full" class:secondRow={twoRows}>
    {#if createLabel && createComponent}
      <Button label={createLabel} icon={IconAdd} kind={'primary'} size={'small'} on:click={() => showCreateDialog()} />
    {/if}
    <ViewletSettingButton bind:viewOptions {viewlet} />
  </div>
</div>

{#if loading}
  <Loading />
{:else if viewlet?.$lookup?.descriptor?.component}
  <FilterBar
    {_class}
    query={searchQuery}
    {viewOptions}
    on:change={(e) => {
      resultQuery = e.detail
    }}
  />
  <Component
    is={viewlet.$lookup.descriptor.component}
    props={{
      _class,
      space,
      options: viewlet.options,
      config: preference?.config ?? viewlet.config,
      viewlet,
      viewOptions,
      createItemDialog: createComponent,
      createItemLabel: createLabel,
      query: resultQuery
    }}
  />
{/if}
