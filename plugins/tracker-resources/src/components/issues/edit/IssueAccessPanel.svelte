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
    type AccessLevel,
    type AccountUuid,
    type Collaborator,
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

  // Non-structural (explicitly granted) records; structural ones (grantedVia == null)
  // stem from createdBy/assignee and are shown in the read-only members section.
  $: grants = collaborators.filter((c) => c.grantedVia != null)
  $: memberAccounts = space?.members ?? []

  $: isSpaceOwner = space?.owners?.includes(me.uuid) ?? false
  $: isMaintainerPlus = hasAccountRole(me, AccountRole.Maintainer)
  $: isSpaceMemberUser = (space?.members?.includes(me.uuid) ?? false) && hasAccountRole(me, AccountRole.User)
  $: hasAdminGrant = collaborators.some((c) => c.collaborator === me.uuid && hasAtLeast(c.level, 'admin'))
  // Client-side courtesy gate; the server enforces authority via CollaboratorGuardMiddleware.
  $: canGrant = !readonly && (isSpaceMemberUser || isSpaceOwner || isMaintainerPlus || hasAdminGrant)

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

  let membersExpanded = false
</script>

<div class="issue-access">
  <div class="section-header">
    <Label label={tracker.string.Access} />
  </div>

  <!-- Read-only project members -->
  <div class="subsection">
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
  <div class="subsection">
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

    {#if canGrant}
      <div class="actions">
        <Button
          icon={IconAdd}
          kind={'ghost'}
          size={'small'}
          label={tracker.string.AddPersonAccess}
          on:click={addPerson}
        />
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
    margin-top: 0.25rem;
  }
</style>
