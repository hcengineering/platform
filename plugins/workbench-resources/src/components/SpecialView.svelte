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
  import { Class, Doc, DocumentQuery, Ref } from '@hcengineering/core'
  import { Asset, getEmbeddedLabel, IntlString } from '@hcengineering/platform'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import {
    AnyComponent,
    Button,
    deviceOptionsStore as deviceInfo,
    Icon,
    IconAdd,
    Label,
    Loading,
    SearchEdit,
    showPopup
  } from '@hcengineering/ui'
  import view, { Viewlet, ViewletDescriptor, ViewletPreference } from '@hcengineering/view'
  import { FilterButton, TableBrowser, ViewletSettingButton } from '@hcengineering/view-resources'
  import SourcePresenter from './search/SourcePresenter.svelte'

  export let _class: Ref<Class<Doc>>
  export let icon: Asset
  export let label: IntlString
  export let createLabel: IntlString | undefined
  export let createComponent: AnyComponent | undefined
  export let createComponentProps: Record<string, any> = {}
  export let descriptor: Ref<ViewletDescriptor> | undefined = undefined
  export let baseQuery: DocumentQuery<Doc> = {}

  let search = ''
  let descr: Viewlet | undefined

  $: resultQuery = updateResultQuery(search, baseQuery)

  const preferenceQuery = createQuery()
  let preference: ViewletPreference | undefined

  const client = getClient()
  let loading = true
  $: updateDescriptor(_class, descriptor)

  function updateDescriptor (_class: Ref<Class<Doc>>, descriptor: Ref<ViewletDescriptor> = view.viewlet.Table) {
    loading = true
    client
      .findOne<Viewlet>(view.class.Viewlet, {
        attachTo: _class,
        descriptor
      })
      .then((res) => {
        descr = res
        if (res !== undefined) {
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

  function updateResultQuery (search: string, baseQuery: DocumentQuery<Doc> = {}): DocumentQuery<Doc> {
    return search === '' ? baseQuery : { ...baseQuery, $search: search }
  }

  $: twoRows = $deviceInfo.twoRows
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
    <ViewletSettingButton viewlet={descr} />
  </div>
</div>

{#if descr}
  {#if loading}
    <Loading />
  {:else}
    <TableBrowser
      {_class}
      config={[
        ...(search !== ''
          ? [
              {
                key: '',
                presenter: SourcePresenter,
                label: getEmbeddedLabel('#'),
                sortingKey: '#score',
                props: { search }
              }
            ]
          : []),
        ...(preference?.config ?? descr.config)
      ]}
      options={descr.options}
      query={resultQuery}
      showNotification
    />
  {/if}
{/if}
