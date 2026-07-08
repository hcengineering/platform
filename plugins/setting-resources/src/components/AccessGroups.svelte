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
  import core, {
    getCurrentAccount,
    type AccessGroup,
    type AccountUuid,
    type Ref
  } from '@hcengineering/core'
  import { AccountArrayEditor } from '@hcengineering/contact-resources'
  import { setPlatformStatus, unknownError } from '@hcengineering/platform'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import {
    ButtonIcon,
    EditBox,
    ExpandCollapse,
    Header,
    IconAdd,
    IconDelete,
    Label,
    Scroller,
    Breadcrumb
  } from '@hcengineering/ui'
  import setting from '../plugin'

  const client = getClient()
  const me = getCurrentAccount()

  let groups: AccessGroup[] = []
  const query = createQuery()
  query.query(core.class.AccessGroup, {}, (res) => {
    groups = res
  })

  // Grant counts per group, to gate deletion (server also enforces this).
  let grantCounts = new Map<Ref<AccessGroup>, number>()
  const grantQuery = createQuery()
  grantQuery.query(core.class.GroupGrant, {}, (res) => {
    const counts = new Map<Ref<AccessGroup>, number>()
    for (const g of res) counts.set(g.group, (counts.get(g.group) ?? 0) + 1)
    grantCounts = counts
  })

  let expanded = new Set<Ref<AccessGroup>>()
  function toggle (id: Ref<AccessGroup>): void {
    if (expanded.has(id)) expanded.delete(id)
    else expanded.add(id)
    expanded = expanded
  }

  async function createGroup (): Promise<void> {
    try {
      const id = await client.createDoc(core.class.AccessGroup, core.space.Workspace, {
        name: '',
        members: [],
        owners: [me.uuid]
      })
      expanded.add(id)
      expanded = expanded
    } catch (err: any) {
      void setPlatformStatus(unknownError(err))
    }
  }

  async function rename (group: AccessGroup, name: string): Promise<void> {
    if (name === group.name) return
    try {
      await client.update(group, { name })
    } catch (err: any) {
      void setPlatformStatus(unknownError(err))
    }
  }

  async function setMembers (group: AccessGroup, members: AccountUuid[]): Promise<void> {
    try {
      await client.update(group, { members })
    } catch (err: any) {
      void setPlatformStatus(unknownError(err))
    }
  }

  async function setOwners (group: AccessGroup, owners: AccountUuid[]): Promise<void> {
    try {
      await client.update(group, { owners })
    } catch (err: any) {
      void setPlatformStatus(unknownError(err))
    }
  }

  async function removeGroup (group: AccessGroup): Promise<void> {
    if ((grantCounts.get(group._id) ?? 0) > 0) return // in use — deletion blocked (server enforces)
    try {
      await client.remove(group)
    } catch (err: any) {
      void setPlatformStatus(unknownError(err))
    }
  }
</script>

<div class="hulyComponent">
  <Header adaptive={'disabled'}>
    <Breadcrumb icon={setting.icon.Members} label={setting.string.AccessGroups} size={'large'} isCurrent />
    <svelte:fragment slot="actions">
      <ButtonIcon icon={IconAdd} kind={'primary'} size={'small'} on:click={createGroup} />
    </svelte:fragment>
  </Header>

  <div class="hulyComponent-content__container column">
    <Scroller>
      <div class="hint"><Label label={setting.string.AccessGroupsHint} /></div>

      {#if groups.length === 0}
        <div class="empty"><Label label={setting.string.NoAccessGroups} /></div>
      {/if}

      {#each groups as group (group._id)}
        {@const inUse = (grantCounts.get(group._id) ?? 0) > 0}
        <div class="group-card">
          <div class="group-row">
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <!-- svelte-ignore a11y-no-static-element-interactions -->
            <div class="group-name clickable" on:click={() => toggle(group._id)}>
              <EditBox
                bind:value={group.name}
                placeholder={setting.string.AccessGroupName}
                on:blur={() => rename(group, group.name)}
              />
            </div>
            <ButtonIcon
              icon={IconDelete}
              size={'small'}
              kind={'tertiary'}
              disabled={inUse}
              tooltip={{ label: inUse ? setting.string.AccessGroupInUse : setting.string.DeleteAccessGroup }}
              on:click={() => removeGroup(group)}
            />
          </div>
          <ExpandCollapse isExpanded={expanded.has(group._id)}>
            <div class="group-editors">
              <div class="editor-row">
                <span class="editor-label"><Label label={setting.string.GroupMembers} /></span>
                <AccountArrayEditor
                  label={setting.string.GroupMembers}
                  value={group.members}
                  onChange={(v) => setMembers(group, v)}
                />
              </div>
              <div class="editor-row">
                <span class="editor-label"><Label label={setting.string.GroupOwners} /></span>
                <AccountArrayEditor
                  label={setting.string.GroupOwners}
                  value={group.owners}
                  onChange={(v) => setOwners(group, v)}
                />
              </div>
            </div>
          </ExpandCollapse>
        </div>
      {/each}
    </Scroller>
  </div>
</div>

<style lang="scss">
  .hint {
    font-size: 0.8125rem;
    color: var(--theme-dark-color);
    padding: 1rem 1rem 0.5rem;
  }
  .empty {
    padding: 1rem;
    color: var(--theme-dark-color);
  }
  .group-card {
    display: flex;
    flex-direction: column;
    margin: 0.25rem 1rem;
    padding: 0.5rem 0.75rem;
    border: 1px solid var(--theme-divider-color);
    border-radius: 0.5rem;
  }
  .group-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
  }
  .group-name {
    flex-grow: 1;
    min-width: 0;
    &.clickable {
      cursor: pointer;
    }
  }
  .group-editors {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding-top: 0.5rem;
  }
  .editor-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .editor-label {
    font-size: 0.75rem;
    color: var(--theme-dark-color);
    min-width: 5rem;
  }
</style>
