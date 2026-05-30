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
  import core, { Class, Doc, Ref, SortingOrder, Space, getCurrentAccount, hasAccountRole } from '@hcengineering/core'
  import { getResource } from '@hcengineering/platform'
  import preference, { SpacePreference } from '@hcengineering/preference'
  import { createQuery, getClient, isAdminUser } from '@hcengineering/presentation'
  import { Scroller, NavItem, Component } from '@hcengineering/ui'
  import { NavLink } from '@hcengineering/view-resources'
  import type { Application, NavigatorModel, SpecialNavModel } from '@hcengineering/workbench'
  import { getSpecialSpaceClass } from '../utils'
  import SpacesNav from './navigator/SpacesNav.svelte'
  import StarredNav from './navigator/StarredNav.svelte'
  import TreeSeparator from './navigator/TreeSeparator.svelte'
  import SavedView from './SavedView.svelte'

  export let model: NavigatorModel | undefined
  export let currentSpace: Ref<Space> | undefined
  export let currentSpecial: string | undefined
  export let currentFragment: string | undefined
  export let currentApplication: Application | undefined

  const client = getClient()
  const hierarchy = client.getHierarchy()
  const query = createQuery()
  // Collab-spaces: spaces that host docs the current account is a Collaborator on,
  // even when the account is not in the space's `members`. Powers nav-tree visibility
  // for collab-only Guests on classes that opted into ClassCollaborators.provideSecurity.
  const collabSpaceLookupQuery = createQuery()
  const collabSpaceQuery = createQuery()

  let memberSpaces: Space[] = []
  let collabSpaces: Space[] = []
  let collabSpaceIds: Set<Ref<Space>> = new Set<Ref<Space>>()
  let starred: Space[] = []
  let shownSpaces: Space[] = []

  const adminUser = isAdminUser()

  $: activeClasses = (model
    ? Array.from(new Set(getSpecialSpaceClass(model).flatMap((c) => hierarchy.getDescendants(c)))).filter(
        (it) => !hierarchy.isMixin(it)
      )
    : []) as Ref<Class<Space>>[]

  $: spaces = adminUser || collabSpaces.length === 0
    ? memberSpaces
    : (() => {
        const seen = new Set(memberSpaces.map((s) => s._id))
        return [...memberSpaces, ...collabSpaces.filter((s) => !seen.has(s._id))]
      })()

  $: if (model && activeClasses.length > 0) {
    const classes = activeClasses
    query.query<Space>(
      classes.length === 1 ? classes[0] : core.class.Space,
      !adminUser
        ? {
            ...(classes.length === 1 ? {} : { _class: { $in: classes } }),
            members: getCurrentAccount().uuid
          }
        : { ...(classes.length === 1 ? {} : { _class: { $in: classes } }) },
      (result) => {
        memberSpaces = result
      },
      { sort: { name: SortingOrder.Ascending } }
    )
  } else if (model) {
    query.unsubscribe()
    memberSpaces = []
  }

  // Track every Space that hosts a Collaborator record naming the current account.
  // We track unconditionally (cheap query, scoped to self by A6) and let the second
  // query narrow by the navigator's class set.
  $: if (!adminUser) {
    collabSpaceLookupQuery.query(
      core.class.Collaborator,
      { collaborator: getCurrentAccount().uuid },
      (collabs) => {
        const next = new Set<Ref<Space>>(collabs.map((c) => c.space))
        if (next.size !== collabSpaceIds.size || !Array.from(next).every((id) => collabSpaceIds.has(id))) {
          collabSpaceIds = next
        }
      },
      { projection: { space: 1 } }
    )
  } else {
    collabSpaceLookupQuery.unsubscribe()
    collabSpaceIds = new Set<Ref<Space>>()
  }

  $: if (!adminUser && collabSpaceIds.size > 0 && activeClasses.length > 0) {
    const classes = activeClasses
    collabSpaceQuery.query<Space>(
      classes.length === 1 ? classes[0] : core.class.Space,
      {
        _id: { $in: Array.from(collabSpaceIds) },
        ...(classes.length === 1 ? {} : { _class: { $in: classes } })
      },
      (result) => {
        collabSpaces = result
      },
      { sort: { name: SortingOrder.Ascending } }
    )
  } else {
    collabSpaceQuery.unsubscribe()
    collabSpaces = []
  }

  let specials: SpecialNavModel[] = []

  let preferences: Map<Ref<Doc>, SpacePreference> = new Map<Ref<Doc>, SpacePreference>()

  const preferenceQuery = createQuery()

  preferenceQuery.query(preference.class.SpacePreference, {}, (res) => {
    preferences = new Map(
      res.map((r) => {
        return [r.attachedTo, r]
      })
    )
  })

  let requestIndex = 0
  async function update (model: NavigatorModel, spaces: Space[], preferences: Map<Ref<Doc>, SpacePreference>) {
    shownSpaces = spaces.filter((sp) => !sp.archived && (model.hideStarred || !preferences.has(sp._id)))
    starred = model.hideStarred ? [] : spaces.filter((sp) => preferences.has(sp._id))
    if (model.specials !== undefined) {
      const [sp, resIndex] = await updateSpecials(model.specials, spaces, ++requestIndex)
      if (resIndex !== requestIndex) return
      const topSpecials = sp.get('top') ?? []
      const bottomSpecials = sp.get('bottom') ?? []
      sp.delete('top')
      sp.delete('bottom')

      const result = [...topSpecials]

      for (const k of Array.from(sp.keys()).sort()) {
        result.push(...(sp.get(k) ?? []))
      }

      result.push(...bottomSpecials)
      specials = result
    } else {
      specials = []
    }
  }

  $: if (model) update(model, spaces, preferences)

  async function updateSpecials (
    specials: SpecialNavModel[],
    spaces: Space[],
    requestIndex: number
  ): Promise<[Map<string, SpecialNavModel[]>, number]> {
    const me = getCurrentAccount()
    const result = new Map<string, SpecialNavModel[]>()

    const spHandlers = await Promise.all(
      specials.map(async (sp) => {
        const pos = sp.position ?? 'top'
        let visible = true
        if (sp.accessLevel !== undefined && !hasAccountRole(me, sp.accessLevel)) {
          visible = false
        }
        if (visible && sp.visibleIf !== undefined) {
          const f = await getResource(sp.visibleIf)
          visible = await f(spaces)
        }

        return () => {
          if (visible) {
            const list = result.get(pos) ?? []
            list.push(sp)
            result.set(pos, list)
          }
        }
      })
    )
    spHandlers.forEach((spHandler) => {
      spHandler()
    })

    return [result, requestIndex]
  }

  async function checkIsDisabled (special: SpecialNavModel) {
    return special.checkIsDisabled && (await (await getResource(special.checkIsDisabled))())
  }

  let menuSelection: boolean = false
</script>

{#if model}
  <Scroller shrink>
    {#if model.specials}
      {#each specials as special, row}
        {#if row > 0 && specials[row].position !== specials[row - 1].position}
          <TreeSeparator line />
        {/if}
        {#await checkIsDisabled(special) then disabled}
          <NavLink space={special.id} {disabled}>
            <NavItem
              label={special.label}
              icon={special.icon}
              selected={menuSelection
                ? false
                : special.id === currentSpecial && (currentFragment === undefined || currentFragment === '')}
              {disabled}
            />
          </NavLink>
        {/await}
      {/each}
    {/if}
    <div class="min-h-3 flex-no-shrink" />

    <SavedView alias={currentApplication?.alias} on:select={(res) => (menuSelection = res.detail)} />
    {#if starred.length > 0 && !model.hideStarred}
      <StarredNav
        label={preference.string.Starred}
        spaces={starred}
        models={model.spaces}
        on:space
        {currentSpace}
        {currentSpecial}
        {currentFragment}
        deselect={menuSelection}
      />
    {/if}

    {#if model.groups && model.groups.length > 0}
      <div class="min-h-3 flex-no-shrink" />
      {#each model.groups as group (group.id)}
        {#if group.component}
          <Component is={group.component} props={{ model: group, currentSpace }} />
        {/if}
      {/each}
    {/if}

    {#each model.spaces as m (m.label)}
      <SpacesNav
        spaces={shownSpaces.filter((it) => hierarchy.isDerived(it._class, m.spaceClass))}
        {currentSpace}
        hasSpaceBrowser={model.specials?.find((p) => p.id === 'spaceBrowser') !== undefined}
        model={m}
        on:open
        {currentSpecial}
        {currentFragment}
        deselect={menuSelection || starred.some((s) => s._id === currentSpace)}
      />
    {/each}
  </Scroller>
{/if}
