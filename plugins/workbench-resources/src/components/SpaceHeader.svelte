<!--
// Copyright © 2020 Anticrm Platform Contributors.
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
  import type { Class, Doc, DocumentQuery, Ref, Space } from '@hcengineering/core'
  import core, { WithLookup } from '@hcengineering/core'
  import { IntlString, Asset } from '@hcengineering/platform'
  import presentation, { createQuery, getClient } from '@hcengineering/presentation'
  import {
    AnyComponent,
    Button,
    IconAdd,
    SearchInput,
    showPopup,
    Header,
    LinkWrapper,
    Breadcrumbs
  } from '@hcengineering/ui'
  import view, { ViewOptions, Viewlet } from '@hcengineering/view'
  import {
    FilterButton,
    ViewletSelector,
    ViewletSettingButton,
    DocNavLink,
    classIcon
  } from '@hcengineering/view-resources'
  import { createEventDispatcher } from 'svelte'
  import plugin from '../plugin'

  export let spaceId: Ref<Space> | undefined
  export let createItemDialog: AnyComponent | undefined
  export let createItemLabel: IntlString = presentation.string.Create
  export let search: string
  export let viewletQuery: DocumentQuery<Viewlet>
  export let viewlet: Viewlet | undefined = undefined
  export let viewlets: Array<WithLookup<Viewlet>> = []
  export let _class: Ref<Class<Doc>> | undefined = undefined
  export let viewOptions: ViewOptions | undefined

  const client = getClient()
  const hierarchy = client.getHierarchy()

  const query = createQuery()
  let space: Space | undefined
  const dispatch = createEventDispatcher()

  const prevSpaceId = spaceId

  $: query.query(
    core.class.Space,
    { _id: spaceId },
    (result) => {
      space = result[0]
    },
    { limit: 1 }
  )

  function showCreateDialog (ev: Event) {
    showPopup(createItemDialog as AnyComponent, { space: spaceId }, 'top')
  }

  $: if (prevSpaceId !== spaceId) {
    search = ''
    dispatch('search', '')
  }

  let description: string
  let editor: AnyComponent
  let icon: Asset | undefined = undefined
  $: if (space) {
    editor = getEditor(space._class) ?? plugin.component.SpacePanel
    icon = classIcon(client, space._class)
    description = space.description
  }

  function getEditor (_class: Ref<Class<Doc>>): AnyComponent | undefined {
    const clazz = hierarchy.getClass(_class)
    const editorMixin = hierarchy.as(clazz, view.mixin.ObjectEditor)
    if (editorMixin?.editor == null && clazz.extends != null) return getEditor(clazz.extends)
    return editorMixin.editor
  }
</script>

{#if space}
  <Header hideActions={createItemDialog === undefined}>
    <svelte:fragment slot="beforeTitle">
      <ViewletSelector {viewletQuery} ignoreFragment bind:viewlet bind:viewlets />
      <ViewletSettingButton bind:viewOptions bind:viewlet />
    </svelte:fragment>

    <DocNavLink object={space} component={editor} noUnderline>
      <Breadcrumbs items={[{ icon, title: space.name }]} size={'large'} hideAfter={description === ''}>
        <svelte:fragment slot="afterLabel">
          <LinkWrapper text={description} />
        </svelte:fragment>
      </Breadcrumbs>
    </DocNavLink>

    <svelte:fragment slot="search">
      <SearchInput bind:value={search} collapsed on:change={() => dispatch('search', search)} />
      <FilterButton {_class} space={spaceId} />
    </svelte:fragment>
    <svelte:fragment slot="actions">
      {#if createItemDialog}
        <Button
          icon={IconAdd}
          label={createItemLabel}
          kind={'primary'}
          on:click={(ev) => {
            showCreateDialog(ev)
          }}
        />
      {/if}
    </svelte:fragment>
  </Header>
{:else}
  <div class="hulyHeader-container" />
{/if}
