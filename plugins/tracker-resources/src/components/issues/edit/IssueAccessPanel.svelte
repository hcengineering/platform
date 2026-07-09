<!--
// Copyright © 2026 Hardcore Engineering Inc.
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
  import { Employee, getName } from '@hcengineering/contact'
  import {
    employeeByAccountStore,
    employeeRefByAccountUuidStore,
    SelectUsersPopup,
    UserInfo
  } from '@hcengineering/contact-resources'
  import core, {
    AccountRole,
    getCurrentAccount,
    hasAccountRole,
    hasAtLeast,
    type AccessGroup,
    type AccessLevel,
    type AccountUuid,
    type Collaborator,
    type GroupGrant,
    type Ref,
    type Space
  } from '@hcengineering/core'
  import { setPlatformStatus, unknownError, type IntlString } from '@hcengineering/platform'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import {
    Button,
    ButtonIcon,
    DropdownLabelsIntl,
    ExpandCollapse,
    IconAdd,
    IconClose,
    Label,
    showPopup,
    type DropdownIntlItem
  } from '@hcengineering/ui'
  import type { Issue } from '@hcengineering/tracker'

  import tracker from '../../../plugin'
  import IssueAccessGrantConfirm from './IssueAccessGrantConfirm.svelte'
  import SelectAccessGroupPopup from './SelectAccessGroupPopup.svelte'

  export let issue: Issue
  export let readonly: boolean = false

  const client = getClient()
  const hierarchy = client.getHierarchy()
  const me = getCurrentAccount()

  const levelItems: DropdownIntlItem[] = [
    { id: 'read', label: tracker.string.LevelRead },
    { id: 'write', label: tracker.string.LevelWrite },
    { id: 'admin', label: tracker.string.LevelAdmin }
  ]

  let collaborators: Collaborator[] = []
  const collabQuery = createQuery()
  $: collabQuery.query(core.class.Collaborator, { attachedTo: issue._id }, (res) => {
    collaborators = res
  })

  let space: Space | undefined
  const spaceQuery = createQuery()
  $: spaceQuery.query(core.class.Space, { _id: issue.space }, (res) => {
    space = res[0]
  })

  let groupGrants: GroupGrant[] = []
  const groupGrantQuery = createQuery()
  $: groupGrantQuery.query(core.class.GroupGrant, { attachedTo: issue._id }, (res) => {
    groupGrants = res
  })

  let groupsById = new Map<Ref<AccessGroup>, AccessGroup>()
  const groupsQuery = createQuery()
  $: groupsQuery.query(core.class.AccessGroup, {}, (res) => {
    groupsById = new Map(res.map((g) => [g._id, g]))
  })

  let expandedGroups = new Set<Ref<GroupGrant>>()
  function toggleGroup (id: Ref<GroupGrant>): void {
    if (expandedGroups.has(id)) expandedGroups.delete(id)
    else expandedGroups.add(id)
    expandedGroups = expandedGroups
  }

  // Managed "additional access" = explicitly granted records (mention / manual / group).
  // Structural records (grantedVia == null) stem from createdBy/assignee: they remain
  // access-relevant (enforced by CollaboratorGuardMiddleware) but are intentionally NOT
  // rendered here as managed grants. The read-only members section below shows
  // project members (Space.members) per the access-management design.
  $: grants = collaborators.filter((c) => c.grantedVia != null)
  $: memberAccounts = space?.members ?? []

  $: isSpaceOwner = space?.owners?.includes(me.uuid) ?? false
  $: isMaintainerPlus = hasAccountRole(me, AccountRole.Maintainer)
  $: isSpaceMemberUser = (space?.members?.includes(me.uuid) ?? false) && hasAccountRole(me, AccountRole.User)
  $: hasAdminGrant = collaborators.some((c) => c.collaborator === me.uuid && hasAtLeast(c.level, 'admin'))
  // Client-side courtesy gate; the server enforces authority via CollaboratorGuardMiddleware.
  $: canGrant = !readonly && (isSpaceMemberUser || isSpaceOwner || isMaintainerPlus || hasAdminGrant)
  // Group grants are stronger than manual grants (future members inherit access),
  // so they need owner / maintainer+ / admin-grantee authority (no ≥User path) — G3.
  $: canGrantGroup = !readonly && (isSpaceOwner || isMaintainerPlus || hasAdminGrant)

  function canRevoke (record: Collaborator): boolean {
    if (readonly) return false
    if (record.grantedBy === me.uuid) return true
    if (record.collaborator === me.uuid) return true // self-decline (grants only; structural not listed here)
    return isSpaceOwner || isMaintainerPlus || hasAdminGrant
  }

  function isSelf (record: Collaborator): boolean {
    return record.collaborator === me.uuid && record.grantedBy !== me.uuid && !(isSpaceOwner || isMaintainerPlus)
  }

  function provenanceLabel (record: Collaborator): IntlString {
    switch (record.grantedVia) {
      case 'mention':
        return tracker.string.GrantedViaMention
      case 'group':
        return tracker.string.GrantedViaGroup
      default:
        return tracker.string.GrantedManually
    }
  }

  function levelLabel (level?: AccessLevel): IntlString {
    switch (level) {
      case 'admin':
        return tracker.string.LevelAdmin
      case 'write':
        return tracker.string.LevelWrite
      default:
        return tracker.string.LevelRead
    }
  }

  function granterName (account?: AccountUuid): string | undefined {
    if (account === undefined) return undefined
    const emp = $employeeByAccountStore.get(account)
    return emp !== undefined ? getName(hierarchy, emp) : undefined
  }

  // A manual grant's level can be changed in place; mention/group levels are
  // fixed here (mention = always read, group level is edited via its GroupGrant).
  function levelEditable (record: Collaborator): boolean {
    return canGrant && record.grantedVia === 'manual'
  }

  async function revoke (record: Collaborator): Promise<void> {
    try {
      await client.remove(record)
    } catch (err: any) {
      void setPlatformStatus(unknownError(err))
    }
  }

  // Records are immutable (guard rejects TxUpdateDoc), so a level change is a
  // remove + create of a fresh manual grant at the new level (design 2.4).
  async function changeLevel (record: Collaborator, newLevel: AccessLevel): Promise<void> {
    if (newLevel === (record.level ?? 'read')) return
    try {
      await client.remove(record)
      await client.addCollection(core.class.Collaborator, issue.space, issue._id, issue._class, 'collaborators', {
        collaborator: record.collaborator,
        grantedVia: 'manual',
        grantedBy: me.uuid,
        level: newLevel
      })
    } catch (err: any) {
      void setPlatformStatus(unknownError(err))
    }
  }

  function accountToRef (): Map<AccountUuid, Ref<Employee>> {
    return $employeeRefByAccountUuidStore
  }

  async function addPerson (): Promise<void> {
    const accToRef = accountToRef()
    const skip: Array<Ref<Employee>> = []
    for (const acc of [...memberAccounts, ...grants.map((g) => g.collaborator)]) {
      const ref = accToRef.get(acc)
      if (ref !== undefined) skip.push(ref)
    }

    showPopup(SelectUsersPopup, { skipAccounts: skip }, undefined, (result?: Array<Ref<Employee>>) => {
      if (result == null || result.length === 0) return
      const refToAcc = new Map<Ref<Employee>, AccountUuid>()
      for (const [acc, ref] of accToRef.entries()) refToAcc.set(ref, acc)
      const accounts = result.map((r) => refToAcc.get(r)).filter((a): a is AccountUuid => a != null)
      if (accounts.length === 0) return

      const names = accounts
        .map((a) => {
          const emp = $employeeByAccountStore.get(a)
          return emp !== undefined ? getName(hierarchy, emp) : a
        })
        .join(', ')

      showPopup(
        IssueAccessGrantConfirm,
        { personName: names, issueTitle: issue.title, initialLevel: 'read' as AccessLevel },
        undefined,
        async (level?: AccessLevel) => {
          if (level == null) return
          for (const account of accounts) {
            try {
              await client.addCollection(
                core.class.Collaborator,
                issue.space,
                issue._id,
                issue._class,
                'collaborators',
                { collaborator: account, grantedVia: 'manual', grantedBy: me.uuid, level }
              )
            } catch (err: any) {
              void setPlatformStatus(unknownError(err))
            }
          }
        }
      )
    })
  }

  // GroupGrant.level IS mutable (guard allows a level-only update); the reconcile
  // trigger propagates the new level onto the derived group-collaborators.
  async function changeGroupLevel (grant: GroupGrant, newLevel: AccessLevel): Promise<void> {
    if (newLevel === (grant.level ?? 'read')) return
    try {
      await client.update(grant, { level: newLevel })
    } catch (err: any) {
      void setPlatformStatus(unknownError(err))
    }
  }

  async function revokeGroup (grant: GroupGrant): Promise<void> {
    try {
      await client.remove(grant)
    } catch (err: any) {
      void setPlatformStatus(unknownError(err))
    }
  }

  function addGroup (): void {
    const alreadyGranted = new Set(groupGrants.map((g) => g.group))
    showPopup(SelectAccessGroupPopup, { skip: [...alreadyGranted] }, undefined, (group?: AccessGroup) => {
      if (group == null) return
      showPopup(
        IssueAccessGrantConfirm,
        {
          personName: group.name,
          issueTitle: issue.title,
          initialLevel: 'read' as AccessLevel,
          memberCount: group.members?.length ?? 0,
          isGroup: true
        },
        undefined,
        async (level?: AccessLevel) => {
          if (level == null) return
          try {
            await client.addCollection(core.class.GroupGrant, issue.space, issue._id, issue._class, 'groupGrants', {
              group: group._id,
              grantedBy: me.uuid,
              level
            })
          } catch (err: any) {
            void setPlatformStatus(unknownError(err))
          }
        }
      )
    })
  }

  let membersExpanded = false
</script>

<div class="issue-access" id="issue-access-panel">
  <div class="section-header">
    <Label label={tracker.string.Access} />
  </div>

  <!-- Read-only project members -->
  <div class="subsection" id="issue-access-members">
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div class="subsection-title clickable" on:click={() => (membersExpanded = !membersExpanded)}>
      <Label label={tracker.string.SpaceMembersAccess} />
      <span class="count">{memberAccounts.length}</span>
    </div>
    <ExpandCollapse isExpanded={membersExpanded}>
      {#each memberAccounts as account (account)}
        {@const emp = $employeeByAccountStore.get(account)}
        {#if emp !== undefined}
          <div class="grant-row">
            <UserInfo value={emp} size={'x-small'} />
          </div>
        {/if}
      {/each}
    </ExpandCollapse>
  </div>

  <!-- Additional (granted) access -->
  <div class="subsection" id="issue-access-additional">
    <div class="subsection-title">
      <Label label={tracker.string.AdditionalAccess} />
    </div>

    {#if grants.length === 0}
      <div class="empty"><Label label={tracker.string.NoAdditionalAccess} /></div>
    {/if}

    {#each grants as record (record._id)}
      {@const emp = $employeeByAccountStore.get(record.collaborator)}
      <div class="grant-row">
        <div class="grant-person">
          {#if emp !== undefined}
            <UserInfo value={emp} size={'x-small'} />
          {:else}
            <span class="overflow-label">{record.collaborator}</span>
          {/if}
          <div class="provenance">
            <Label label={provenanceLabel(record)} />
            {#if granterName(record.grantedBy) !== undefined}
              <span class="ml-1"
                ><Label label={tracker.string.GrantedByOn} params={{ name: granterName(record.grantedBy) }} /></span
              >
            {/if}
          </div>
        </div>

        <div class="grant-level">
          {#if levelEditable(record)}
            <DropdownLabelsIntl
              items={levelItems}
              selected={record.level ?? 'read'}
              label={tracker.string.AccessLevelLabel}
              kind={'ghost'}
              size={'small'}
              on:selected={(e) => changeLevel(record, e.detail)}
            />
          {:else}
            <span class="level-badge"><Label label={levelLabel(record.level)} /></span>
          {/if}
        </div>

        {#if canRevoke(record)}
          <ButtonIcon
            icon={IconClose}
            size={'extra-small'}
            kind={'tertiary'}
            tooltip={{ label: isSelf(record) ? tracker.string.GiveUpAccess : tracker.string.RevokeAccess }}
            on:click={() => revoke(record)}
          />
        {/if}
      </div>
    {/each}

    {#each groupGrants as grant (grant._id)}
      {@const group = groupsById.get(grant.group)}
      <div class="grant-row">
        <div class="grant-person">
          <!-- svelte-ignore a11y-click-events-have-key-events -->
          <!-- svelte-ignore a11y-no-static-element-interactions -->
          <div
            class="group-head clickable"
            on:click={() => {
              toggleGroup(grant._id)
            }}
          >
            <span class="overflow-label group-name">{group?.name ?? grant.group}</span>
            <span class="count">
              <Label label={tracker.string.GroupMembersCount} params={{ count: group?.members?.length ?? 0 }} />
            </span>
          </div>
          <div class="provenance">
            <Label label={tracker.string.GrantedViaGroup} />
            {#if granterName(grant.grantedBy) !== undefined}
              <span class="ml-1"
                ><Label label={tracker.string.GrantedByOn} params={{ name: granterName(grant.grantedBy) }} /></span
              >
            {/if}
          </div>
        </div>

        <div class="grant-level">
          {#if canGrantGroup}
            <DropdownLabelsIntl
              items={levelItems}
              selected={grant.level ?? 'read'}
              label={tracker.string.AccessLevelLabel}
              kind={'ghost'}
              size={'small'}
              on:selected={(e) => changeGroupLevel(grant, e.detail)}
            />
          {:else}
            <span class="level-badge"><Label label={levelLabel(grant.level)} /></span>
          {/if}
        </div>

        {#if canGrantGroup}
          <ButtonIcon
            icon={IconClose}
            size={'extra-small'}
            kind={'tertiary'}
            tooltip={{ label: tracker.string.RevokeGroupAccess }}
            on:click={() => revokeGroup(grant)}
          />
        {/if}
      </div>
      {#if group !== undefined}
        <ExpandCollapse isExpanded={expandedGroups.has(grant._id)}>
          <div class="group-members">
            {#each group.members ?? [] as account (account)}
              {@const emp = $employeeByAccountStore.get(account)}
              {#if emp !== undefined}
                <div class="grant-row indented">
                  <UserInfo value={emp} size={'x-small'} />
                </div>
              {/if}
            {/each}
          </div>
        </ExpandCollapse>
      {/if}
    {/each}

    {#if canGrant || canGrantGroup}
      <div class="actions">
        {#if canGrant}
          <Button
            icon={IconAdd}
            kind={'ghost'}
            size={'small'}
            label={tracker.string.AddPersonAccess}
            on:click={addPerson}
          />
        {/if}
        {#if canGrantGroup}
          <Button
            icon={IconAdd}
            kind={'ghost'}
            size={'small'}
            label={tracker.string.AddGroupAccess}
            on:click={addGroup}
          />
        {/if}
      </div>
    {/if}
  </div>
</div>

<style lang="scss">
  .issue-access {
    display: flex;
    flex-direction: column;
    width: 100%;
    gap: 0.5rem;
  }
  .section-header {
    font-weight: 500;
    color: var(--theme-caption-color);
  }
  .subsection {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  .subsection-title {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    font-size: 0.75rem;
    color: var(--theme-dark-color);
    text-transform: uppercase;
    letter-spacing: 0.02em;

    &.clickable {
      cursor: pointer;
    }
    .count {
      color: var(--theme-content-color);
    }
  }
  .grant-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    min-height: 2rem;
  }
  .grant-person {
    display: flex;
    flex-direction: column;
    flex-grow: 1;
    min-width: 0;
  }
  .provenance {
    display: flex;
    align-items: center;
    font-size: 0.75rem;
    color: var(--theme-dark-color);
  }
  .grant-level {
    flex-shrink: 0;
  }
  .level-badge {
    font-size: 0.75rem;
    color: var(--theme-content-color);
    padding: 0 0.375rem;
  }
  .empty {
    font-size: 0.75rem;
    color: var(--theme-dark-color);
  }
  .actions {
    display: flex;
    gap: 0.5rem;
    margin-top: 0.25rem;
  }
  .group-head {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    min-width: 0;

    &.clickable {
      cursor: pointer;
    }
    .count {
      font-size: 0.75rem;
      color: var(--theme-dark-color);
    }
  }
  .group-name {
    color: var(--theme-content-color);
  }
  .group-members {
    padding-left: 0.5rem;
    border-left: 1px solid var(--theme-divider-color);
    margin-left: 0.25rem;
  }
  .grant-row.indented {
    min-height: 1.75rem;
  }
</style>
