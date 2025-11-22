<!--
// Copyright © 2025 Hardcore Engineering Inc.
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
  import core, { Class, Doc, getCurrentAccount, Ref, Space } from '@hcengineering/core'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { Action, getCurrentLocation, navigate, location as locationStore } from '@hcengineering/ui'
  import { MasterTag, FavoriteType } from '@hcengineering/card'
  import { TreeNode } from '@hcengineering/view-resources'
  import { GroupsNavModel } from '@hcengineering/workbench'
  import view from '@hcengineering/view'
  import preference from '@hcengineering/preference'
  import TagHierarchy from './TagHierarchy.svelte'
  import card from '../../plugin'

  export let model: GroupsNavModel
  export let currentSpace: Ref<Space> | undefined

  let classes: MasterTag[] = []
  let _class: Ref<Class<Doc>> | undefined
  let favoriteTypes: Ref<MasterTag>[] = []
  let favorites = new Map<Ref<MasterTag>, FavoriteType>()

  const client = getClient()
  const typesQuery = createQuery()
  const favoritesQuery = createQuery()
  const me = getCurrentAccount()

  typesQuery.query(card.class.MasterTag, {}, (res) => {
    classes = res.filter((it) => it.removed !== true).sort((a, b) => a.label.localeCompare(b.label))
  })

  function getRootClasses (_classes: MasterTag[]): MasterTag[] {
    return _classes.filter((it) => it.extends === card.class.Card)
  }

  function getFavoriteClasses (_classes: MasterTag[], _favoriteTypes: Ref<MasterTag>[]): MasterTag[] {
    const hierarchy = client.getHierarchy()
    const rootClasses = getRootClasses(_classes)
    const rootFavorites = rootClasses.filter((it) => _favoriteTypes.includes(it._id))
    const nonRootFavorites = _classes.filter(
      (it) => _favoriteTypes.includes(it._id) && !rootClasses.some((root) => root._id === it._id)
    )

    // Add non-root favorites that aren't descendants of existing root favorites
    const additionalFavorites = nonRootFavorites.filter((nonRoot) => {
      return !rootFavorites.some((rootFav) => {
        try {
          return hierarchy.isDerived(nonRoot._id, rootFav._id)
        } catch {
          return false
        }
      })
    })

    return [...rootFavorites, ...additionalFavorites].sort((a, b) => a.label.localeCompare(b.label))
  }

  function buildTypePath (currentPath: any[], type: Ref<MasterTag>): any[] {
    return [...currentPath.slice(0, 3), 'type', type]
  }

  function selectType (type: Ref<MasterTag>): void {
    const loc = getCurrentLocation()
    loc.path = buildTypePath(loc.path, type)
    navigate(loc)
  }

  favoritesQuery.query(card.class.FavoriteType, { createdBy: { $in: me.socialIds } }, (res) => {
    favoriteTypes = res.map((item: FavoriteType) => item.attachedTo)
    favorites = new Map(res.map((fav) => [fav.attachedTo, fav]))
  })

  function toggleFavoriteType (typeId: Ref<MasterTag>): void {
    const favorite = favorites.get(typeId)
    if (favorite !== undefined) {
      void client.remove(favorite)
    } else {
      void client.createDoc(card.class.FavoriteType, core.space.Workspace, {
        attachedTo: typeId
      })
    }
  }

  function getItemActions (typeId: Ref<MasterTag>): Action[] {
    const favorite = favorites.get(typeId)
    const isFavorite = favorite !== undefined
    return [
      {
        id: 'toggle-favorite',
        label: isFavorite ? preference.string.Unstar : preference.string.Star,
        icon: view.icon.Star,
        action: async (): Promise<void> => {
          toggleFavoriteType(typeId)
        }
      }
    ]
  }

  $: _class = $locationStore.path[4] as Ref<Class<Doc>>
  $: selectedClass = classes.find((it) => it._id === _class)
  $: rootClasses = getRootClasses(classes)
  $: favoriteRootClasses = getFavoriteClasses(classes, favoriteTypes)
  $: nonFavoriteRootClasses = rootClasses.filter((it) => !favoriteTypes.includes(it._id))
  $: empty = rootClasses === undefined || rootClasses.length === 0
</script>

<div class="flex-col w-full flex-no-shrink">
  {#if favoriteRootClasses.length > 0}
    <TreeNode
      _id={'tree-favorites-' + model.id}
      label={card.string.Favorites}
      highlighted={selectedClass !== undefined && favoriteTypes.includes(selectedClass._id)}
      isFold
      empty={false}
    >
      <TagHierarchy
        classes={favoriteRootClasses}
        allClasses={classes}
        {_class}
        space={undefined}
        {currentSpace}
        {getItemActions}
        on:select={(e) => {
          selectType(e.detail)
        }}
      />
    </TreeNode>
  {/if}

  {#if nonFavoriteRootClasses.length > 0}
    <TreeNode
      _id={'tree-' + model.id}
      label={model.label}
      highlighted={selectedClass !== undefined && !favoriteTypes.includes(selectedClass._id)}
      isFold={!empty}
      empty={false}
    >
      <TagHierarchy
        classes={nonFavoriteRootClasses}
        allClasses={classes}
        {_class}
        space={undefined}
        {currentSpace}
        {getItemActions}
        excludedClasses={favoriteTypes}
        on:select={(e) => {
          selectType(e.detail)
        }}
      />
    </TreeNode>
  {/if}
</div>
