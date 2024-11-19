<!--
// Copyright © 2024 Hardcore Engineering Inc.
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
  import { onDestroy } from 'svelte'
  import {
    AnyComponent,
    AnySvelteComponent,
    Button,
    Breadcrumb,
    Component,
    IconAdd,
    Header,
    Separator,
    showPopup,
    getLocation,
    resolvedLocationStore,
    deviceOptionsStore as deviceInfo,
    defineSeparators,
    workbenchSeparators
  } from '@hcengineering/ui'
  import { Doc, DocumentQuery, Ref, Space, mergeQueries } from '@hcengineering/core'
  import { IntlString, Asset } from '@hcengineering/platform'

  export let space: Ref<Space> | undefined = undefined
  export let navigationComponent: AnyComponent
  export let navigationComponentProps: Record<string, any> | undefined = undefined
  export let navigationComponentLabel: IntlString
  export let navigationComponentIcon: Asset | undefined = undefined
  export let createComponent: AnyComponent | undefined = undefined
  export let createComponentProps: Record<string, any> = {}
  export let mainComponentLabel: IntlString
  export let mainComponentIcon: Asset | undefined = undefined
  export let mainHeaderComponent: AnyComponent
  export let query: DocumentQuery<Doc> = {}
  export let syncWithLocationQuery: boolean = true
  export let mainComponent: AnyComponent | AnySvelteComponent
  export let mainComponentProps = {}

  let locationQuery: DocumentQuery<Doc> = {}
  let resultQuery: DocumentQuery<Doc> = {}
  let spaceQuery: DocumentQuery<Doc> = {}
  $: spaceQuery = space !== undefined ? { space } : {}
  $: resultQuery = mergeQueries(query, mergeQueries(spaceQuery, locationQuery)) ?? {}

  if (syncWithLocationQuery) {
    locationQuery = getLocation()?.query as any
    onDestroy(
      resolvedLocationStore.subscribe((newLocation) => {
        locationQuery = newLocation?.query ?? {}
      })
    )
  }

  function showCreateDialog (): void {
    if (createComponent === undefined) return
    showPopup(createComponent, { ...createComponentProps, space }, 'top')
  }
  defineSeparators('parentsNavigator', workbenchSeparators)
</script>

<div class="hulyComponent-content__container columns">
  {#if $deviceInfo.navigator.visible}
    <div
      class="antiPanel-navigator {$deviceInfo.navigator.direction === 'horizontal'
        ? 'portrait'
        : 'landscape'} border-left"
    >
      <div class="hulyComponent-content__column">
        <Header adaptive={'disabled'}>
          <Breadcrumb icon={navigationComponentIcon} label={navigationComponentLabel} size={'large'} />
          <svelte:fragment slot="actions">
            {#if createComponent}
              <Button
                icon={IconAdd}
                kind={'icon'}
                on:click={() => {
                  showCreateDialog()
                }}
              />
            {/if}
          </svelte:fragment>
        </Header>
        <Component
          is={navigationComponent}
          props={{
            ...navigationComponentProps,
            query: spaceQuery
          }}
        />
      </div>
      <Separator
        name={'parentsNavigator'}
        float={$deviceInfo.navigator.float ? 'navigator' : true}
        index={0}
        color={'transparent'}
      />
    </div>

    <Separator
      name={'parentsNavigator'}
      float={$deviceInfo.navigator.float}
      index={0}
      color={'transparent'}
      separatorSize={0}
      short
    />
  {/if}
  <div class="hulyComponent-content__column">
    <Header adaptive={'disabled'}>
      <Breadcrumb icon={mainComponentIcon} label={mainComponentLabel} size={'large'} />
      <svelte:fragment slot="actions">
        {#if mainHeaderComponent}
          <Component is={mainHeaderComponent} />
        {/if}
      </svelte:fragment>
    </Header>
    <Component
      is={mainComponent}
      props={{
        ...(mainComponentProps ?? {}),
        query: resultQuery,
        totalQuery: resultQuery
      }}
    />
  </div>
</div>
