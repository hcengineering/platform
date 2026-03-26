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
// See the License for the specific language governing permissions and
// limitations under the License.
-->
<script lang="ts">
  import core, { ModulePermissionGroup, type Class, type Doc, type Permission, type Ref } from '@hcengineering/core'
  import { getEmbeddedLabel, getMetadata, type IntlString } from '@hcengineering/platform'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import workbench, { type Application } from '@hcengineering/workbench'
  import { Breadcrumb, Header, Icon, Label, Loading, Scroller, Toggle } from '@hcengineering/ui'
  import settingsRes from '../plugin'

  let loadingSettings = true
  let loadingPermissions = true
  let workspaceAppsReady = false

  let moduleGroups: ModulePermissionGroup[] = []
  let permissionsMap: Map<Ref<Permission>, Permission> = new Map<Ref<Permission>, Permission>()
  let hiddenApplicationIds: Array<Ref<Application>> = []

  const excludedApplicationIds = getMetadata(workbench.metadata.ExcludedApplications) ?? []

  const client = getClient()
  const moduleGroupsQuery = createQuery()
  const permissionsQuery = createQuery()
  const hiddenAppsQuery = createQuery()

  $: moduleGroupsQuery.query(core.class.ModulePermissionGroup, {}, (res) => {
    moduleGroups = res as unknown as ModulePermissionGroup[]
    loadingSettings = false
  })

  $: permissionsQuery.query(core.class.Permission, {}, (res) => {
    permissionsMap = new Map((res as Permission[]).map((permission) => [permission._id, permission]))
    loadingPermissions = false
  })

  $: hiddenAppsQuery.query(workbench.class.HiddenApplication, { space: core.space.Workspace }, (res) => {
    hiddenApplicationIds = res.map((r) => r.attachedTo)
    workspaceAppsReady = true
  })

  /** Same notion of “available in this workspace” as the app switcher: model apps minus hidden/excluded. */
  $: workspaceApplications = client
    .getModel()
    .findAllSync<Application>(workbench.class.Application, {
    hidden: false,
    _id: { $nin: excludedApplicationIds }
  })
    .filter((app) => !hiddenApplicationIds.includes(app._id))

  $: applicationsMap = new Map<Ref<Doc>, Application>(
    workspaceApplications.map((application) => [application._id as Ref<Doc>, application])
  )

  $: loading = loadingSettings || loadingPermissions || !workspaceAppsReady

  /** Ignore permission groups for applications not enabled in this workspace. */
  $: visibleModuleGroups = moduleGroups.filter((group) => applicationsMap.has(group.application))

  function getApplicationLabel (applicationId: Ref<Doc>): IntlString {
    return applicationsMap.get(applicationId)?.label ?? getEmbeddedLabel(applicationId)
  }

  function getApplication (applicationId: Ref<Doc>): Application | undefined {
    return applicationsMap.get(applicationId)
  }

  function getDisabledPermissions (group: ModulePermissionGroup): Set<Ref<Permission>> {
    return new Set(group.disabledPermissions ?? [])
  }

  function isPermissionActive (group: ModulePermissionGroup, permissionId: Ref<Permission>): boolean {
    return !getDisabledPermissions(group).has(permissionId)
  }

  async function togglePermission (
    group: ModulePermissionGroup,
    permissionId: Ref<Permission>,
    enabled: boolean
  ): Promise<void> {
    if (!isModuleEnabled(group)) return
    const disabled = getDisabledPermissions(group)
    if (enabled) {
      disabled.delete(permissionId)
    } else {
      disabled.add(permissionId)
    }
    await client.updateDoc(core.class.ModulePermissionGroup, core.space.Model, group._id, {
      disabledPermissions: Array.from(disabled)
    } as any)
  }

  async function toggleModule (group: ModulePermissionGroup, enabled: boolean): Promise<void> {
    await client.updateDoc(core.class.ModulePermissionGroup, core.space.Model, group._id, {
      enabled
    } as any)
  }

  function isModuleEnabled (group: ModulePermissionGroup): boolean {
    return group.enabled ?? true
  }

  function getPermissionLabel (permissionId: Ref<Permission>): IntlString {
    return permissionsMap.get(permissionId)?.label ?? getEmbeddedLabel(permissionId)
  }

  function onAccessToggle (group: ModulePermissionGroup, ev: Event): void {
    const e = ev as CustomEvent<boolean>
    void toggleModule(group, e.detail)
  }

  function onPermissionToggle (group: ModulePermissionGroup, permissionId: Ref<Permission>, ev: Event): void {
    const e = ev as CustomEvent<boolean>
    void togglePermission(group, permissionId, e.detail)
  }

  function handleAccessToggle (group: ModulePermissionGroup): (ev: Event) => void {
    return (ev: Event) => {
      onAccessToggle(group, ev)
    }
  }

  function handlePermissionToggle (group: ModulePermissionGroup, permissionId: Ref<Permission>): (ev: Event) => void {
    return (ev: Event) => {
      onPermissionToggle(group, permissionId, ev)
    }
  }
</script>

<div class="hulyComponent">
  <Header adaptive={'disabled'}>
    <Breadcrumb label={settingsRes.string.AccountPermissionsSettings} size={'large'} isCurrent />
  </Header>
  <div class="hulyComponent-content__column content">
    {#if loading}
      <div class="w-full h-full flex-col-center justify-center">
        <Loading />
      </div>
    {:else}
      <Scroller align={'center'} padding={'var(--spacing-3)'} bottomPadding={'var(--spacing-3)'}>
        <div class="hulyComponent-content guestPermissionsRoot flex-col">
          <section class="section">
            <div class="sectionHeader">
              <div class="sectionTitle">
                <Label label={settingsRes.string.AccountPermissionsModulePermissions} />
              </div>
              <div class="sectionHint">
                <Label label={settingsRes.string.AccountPermissionsModulePermissionsHint} />
              </div>
            </div>

            <div class="cardStack">
              {#each visibleModuleGroups as group}
                {@const app = getApplication(group.application)}
                {@const moduleOn = isModuleEnabled(group)}
                {@const permissionCount = (group.permissions ?? []).length}
                <div class="permissionModuleCard" class:permissionModuleCard-off={!moduleOn}>
                  <div
                    class="permissionModuleCard-header"
                    class:permissionModuleCard-headerOnly={permissionCount === 0}
                  >
                    <div class="permissionModuleCard-headerMain">
                      {#if app}
                        <div class="appIcon appIcon-sm">
                          <Icon icon={app.icon} size={'small'} />
                        </div>
                      {:else}
                        <div class="appIcon appIcon-sm appIcon-placeholder" />
                      {/if}
                      <div class="permissionModuleCard-titles">
                        <div class="permissionModuleCard-name">
                          <Label label={getApplicationLabel(group.application)} />
                        </div>
                      </div>
                    </div>
                    <div class="permissionModuleCard-toggleCell">
                      <Toggle on={moduleOn} on:change={handleAccessToggle(group)} />
                    </div>
                  </div>

                  {#if permissionCount > 0}
                    <div class="permissionRows">
                      {#each group.permissions ?? [] as permissionId}
                        <div class="permissionRow">
                          <div class="permissionRow-label">
                            <Label label={getPermissionLabel(permissionId)} />
                          </div>
                          <div class="permissionRow-toggleCell">
                            <Toggle
                              disabled={!moduleOn}
                              on={isPermissionActive(group, permissionId)}
                              on:change={handlePermissionToggle(group, permissionId)}
                            />
                          </div>
                        </div>
                      {/each}
                    </div>
                  {/if}
                </div>
              {/each}
              {#if visibleModuleGroups.length === 0}
                <div class="emptyState emptyState-block">—</div>
              {/if}
            </div>
          </section>
        </div>
      </Scroller>
    {/if}
  </div>
</div>

<style lang="scss">
  .guestPermissionsRoot {
    max-width: 40rem;
    width: 100%;
    margin: 0 auto;
    gap: 2rem;
  }

  .section {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .sectionHeader {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .sectionTitle {
    font-weight: 500;
    font-size: 1rem;
    color: var(--theme-content-color);
  }

  .sectionHint {
    font-size: 0.8rem;
    color: var(--theme-halfcontent-color);
  }

  /* Matches packages/ui Toggle width for a single aligned column */
  $toggleTrackWidth: 2.25rem;

  .cardStack {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    padding-top: 0.5rem;
  }

  .appIcon {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 2.5rem;
    height: 2.5rem;
    border-radius: var(--small-focus-BorderRadius);
    background-color: var(--theme-button-default);
    color: var(--theme-caption-color);
  }

  .appIcon-sm {
    width: 2rem;
    height: 2rem;
  }

  .appIcon-placeholder {
    opacity: 0.35;
  }

  .permissionModuleCard {
    display: flex;
    flex-direction: column;
    border-radius: var(--small-focus-BorderRadius);
    border: 1px solid var(--theme-navpanel-divider);
    overflow: hidden;
    background-color: var(--theme-panel-color);
    box-shadow: var(--theme-popup-shadow);
  }

  .permissionModuleCard-off .permissionRows {
    opacity: 0.55;
  }

  .permissionModuleCard-header {
    display: grid;
    grid-template-columns: minmax(0, 1fr) #{$toggleTrackWidth};
    align-items: center;
    column-gap: 0.75rem;
    padding: 0.75rem 1rem;
    background-color: var(--theme-comp-header-color);
    border-bottom: 1px solid var(--theme-divider-color);

    &.permissionModuleCard-headerOnly {
      border-bottom: none;
    }
  }

  .permissionModuleCard-headerMain {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 0.75rem;
    min-width: 0;
  }

  .permissionModuleCard-toggleCell,
  .permissionRow-toggleCell {
    display: flex;
    justify-content: center;
    align-items: center;
    width: $toggleTrackWidth;
    justify-self: end;
  }

  .permissionModuleCard-name {
    font-weight: 500;
    font-size: 0.9375rem;
    color: var(--theme-content-color);
  }

  .permissionModuleCard-meta {
    font-size: 0.75rem;
    color: var(--theme-halfcontent-color);
  }

  .permissionRows {
    display: flex;
    flex-direction: column;
    padding: 0.25rem 1rem 0.75rem;
    background-color: var(--theme-panel-color);
  }

  .permissionRow {
    display: grid;
    grid-template-columns: minmax(0, 1fr) #{$toggleTrackWidth};
    align-items: center;
    column-gap: 0.75rem;
    padding: 0.625rem 0 0.625rem 0.25rem;
    min-height: 2.5rem;
  }

  .permissionRow:not(:first-child) {
    border-top: 1px solid var(--theme-navpanel-divider);
  }

  .permissionRow-label {
    min-width: 0;
    color: var(--theme-content-color);
  }

  .emptyState {
    font-size: 0.875rem;
    color: var(--theme-halfcontent-color);
    padding: 0.25rem 0;
  }

  .emptyState-block {
    padding: 0.5rem 0;
  }
</style>
