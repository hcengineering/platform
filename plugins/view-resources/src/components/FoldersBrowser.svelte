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
  import { Class, Doc, DocumentQuery, Ref, SortingOrder } from '@hcengineering/core'
  import { createQuery } from '@hcengineering/presentation'
  import { Action, Button, Header, navigate } from '@hcengineering/ui'
  import { getResource, type Resource } from '@hcengineering/platform'
  import { IntlString, Asset } from '@hcengineering/platform'

  import FolderTreeLevel from './FolderTreeLevel.svelte'

  export let _class: Ref<Class<Doc>>
  export let query: DocumentQuery<Doc>
  export let titleKey: string = 'title'
  export let parentKey: string = 'parent'
  export let getFolderLink: Resource<(doc: Doc, props: Record<string, any>) => Location>
  export let getFolderIdFromFragment: Resource<(fragment: string) => Ref<Doc> | undefined>
  export let allObjectsIcon: Asset
  export let allObjectsLabel: IntlString


  export let currentFragment: string | undefined
  export let forciblyСollapsed: boolean = false

  let folders: Ref<Doc>[] = []
  let folderById: Map<Ref<Doc>, Doc> = new Map<Ref<Doc>, Doc>()
  let descendants: Map<Ref<Doc> | null, Doc[]> = new Map<Ref<Doc>, Doc[]>()

  function getTitle(doc: Doc): string {
    return ((doc || {}) as any)[titleKey] || ''
  }

  function getParent(doc: Doc): Ref<Doc> | null {
    return ((doc || {}) as any)[parentKey] || null
  }

  function getDescendants (obj: Ref<Doc> | null): Ref<Doc>[] {
    return (descendants.get(obj) ?? []).sort((a, b) => getTitle(a).localeCompare(getTitle(b))).map((p) => p._id)
  }

  let selected: Ref<Doc> | undefined
  //$: selected = getFolderId(currentFragment ?? '')
  //$: selected = getFolderIdFromFragment(currentFragment ?? '')

  const q = createQuery()
  q.query(
    _class,
    query || {},
    (result) => {
      folderById.clear()
      descendants.clear()

      for (const doc of result) {
        const current = descendants.get(getParent(doc)) ?? []
        current.push(doc)
        descendants.set(getParent(doc), current)
        folderById.set(doc._id, doc)
      }

      folderById = folderById
      descendants = descendants
      folders = getDescendants(null)
      console.log(folders)
    },
    {
      sort: {
        name: SortingOrder.Ascending
      }
    }
  )

  async function handleFolderSelected (_id: Ref<Doc>) {
    selected = _id
    const folder = folderById.get(_id)
    if (getFolderLink) {
      const getFolderLinkFunction = await getResource(getFolderLink)
      navigate(getFolderLinkFunction(_id, folder?.space))
    }
  }

  async function handleAllItemsSelected () {
    const folder = selected && folderById.get(selected)
    if (folder && getFolderLink) {
      const getFolderLinkFunction = await getResource(getFolderLink)
      navigate(getFolderLinkFunction(undefined, folder?.space))
    }
    selected = undefined
  }

  async function getFolderId (currentFragment: string) {
    const getFolderIdFunction = await getResource(getFolderIdFromFragment)
    return getFolderIdFunction(currentFragment)
  }

  async function getFolderActions (obj: Doc): Promise<Action[]> {
    return []
  }
</script>

<div>
  {#if allObjectsLabel}
    <Header adaptive={'disabled'}>
      <Button
        size={'large'}
        kind={'link'}
        icon={allObjectsIcon}
        label={allObjectsLabel}
        selected={!selected}
        width="100%"
        justify="left"
        on:click={handleAllItemsSelected}
      />
    </Header>
  {/if}
  <FolderTreeLevel
    {folders}
    {descendants}
    {folderById}
    {selected}
    {titleKey}
    on:selected={(ev) => {
      handleFolderSelected(ev.detail)
    }}
  />
</div>
