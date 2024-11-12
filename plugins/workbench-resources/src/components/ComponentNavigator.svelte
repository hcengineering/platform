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
    resolvedLocationStore
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
  export let mainComponentIcon: Asset
  export let query: DocumentQuery<Doc> = {}
  export let syncQueryAndLocation
  export let mainComponent: AnyComponent | AnySvelteComponent
  export let mainComponentProps = {}

  let locationQuery: DocumentQuery<Doc> = {}
  let resultQuery: DocumentQuery<Doc> = {}
  $: resultQuery = mergeQueries(query, locationQuery) ?? {}

  if (syncQueryAndLocation) {
    locationQuery = getLocation()?.query
    onDestroy(resolvedLocationStore.subscribe(handleLocationChanged))

    function handleLocationChanged (loc: Location) {
      locationQuery = loc?.query ?? {}
    }
  }

  function showCreateDialog (): void {
    if (createComponent === undefined) return
    showPopup(createComponent, { ...createComponentProps, space }, 'top')
  }
</script>

<div class="hulyComponent">
  <div class="hulyComponent-content__container columns">
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
      <Component is={navigationComponent} props={navigationComponentProps} />
    </div>
    <Separator name={'navigationSection'} index={0} color={'var(--theme-divider-color)'} />
    <div class="hulyComponent-content__column">
      <Header adaptive={'disabled'}>
        <Breadcrumb icon={mainComponentIcon} label={mainComponentLabel} size={'large'} />
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
</div>
