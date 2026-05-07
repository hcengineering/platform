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
// See the License for the specific language governing permissions and
// limitations under the License.
-->
<script lang="ts">
  import card, { Card } from '@hcengineering/card'
  import chat from '@hcengineering/chat'
  import communication, { GuestCommunicationSettings } from '@hcengineering/communication'
  import contact, { ensureEmployeeForPerson } from '@hcengineering/contact'
  import { getAccountClient } from '@hcengineering/contact-resources'
  import core, {
    type Account,
    AccountRole,
    AccountUuid,
    ModulePermissionGroup,
    getCurrentAccount,
    pickPrimarySocialId,
    readOnlyGuestAccountUuid,
    type Doc,
    type Permission,
    type Ref
  } from '@hcengineering/core'
  import { getEmbeddedLabel, getMetadata, type IntlString } from '@hcengineering/platform'
  import { createQuery, getClient, uiContext } from '@hcengineering/presentation'
  import workbench, { type Application } from '@hcengineering/workbench'
  import {
    Breadcrumb,
    Component,
    defineSeparators,
    Header,
    Icon,
    Label,
    Loading,
    NavItem,
    Scroller,
    Separator,
    Toggle,
    twoPanelsSeparators
  } from '@hcengineering/ui'
  import setting from '@hcengineering/setting'
  import { onMount } from 'svelte'
  import AnonymousGuestSpaceInput from './AnonymousGuestSpaceInput.svelte'
  import AvailableSpacesInput from './AvailableSpacesInput.svelte'
  import settingsRes from '../plugin'

  let loadingSettings = true
  let loadingPermissions = true
  let workspaceAppsReady = false
  let loadingWorkspaceGuest = true

  let allowReadOnlyGuests = false
  let allowGuestSignUp = false
  let existingGuestChatSettings: GuestCommunicationSettings | undefined = undefined

  const accountClient = getAccountClient()

  let moduleGroups: ModulePermissionGroup[] = []
  let permissionsMap: Map<Ref<Permission>, Permission> = new Map<Ref<Permission>, Permission>()
  let hiddenApplicationIds: Array<Ref<Application>> = []

  const excludedApplicationIds = getMetadata(workbench.metadata.ExcludedApplications) ?? []
  const communicationApiEnabled = getMetadata(communication.metadata.Enabled) === true

  let guestPermissionsTab: 'guest' | 'anonymous' = 'guest'

  const client = getClient()
  const moduleGroupsQuery = createQuery()
  const permissionsQuery = createQuery()
  const hiddenAppsQuery = createQuery()
  const guestCommunicationQuery = createQuery()

  onMount(() => {
    void (async (): Promise<void> => {
      try {
        const res = await accountClient.getWorkspaceInfo()
        allowReadOnlyGuests = res.allowReadOnlyGuest ?? false
        allowGuestSignUp = res.allowGuestSignUp ?? false
      } finally {
        loadingWorkspaceGuest = false
      }
    })()
  })

  $: {
    if (communicationApiEnabled) {
      guestCommunicationQuery.query(communication.class.GuestCommunicationSettings, {}, (settings) => {
        existingGuestChatSettings = settings[0]
      })
    }
  }

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

  $: loading = loadingSettings || loadingPermissions || !workspaceAppsReady || loadingWorkspaceGuest

  $: modulePermissionsRole = guestPermissionsTab === 'guest' ? AccountRole.Guest : AccountRole.ReadOnlyGuest

  /** Module permission groups for the selected tab (Guest vs anonymous read-only). */
  $: visibleModuleGroups = moduleGroups.filter(
    (group) => applicationsMap.has(group.application) && group.role === modulePermissionsRole
  )

  $: sortedVisibleModuleGroups = [...visibleModuleGroups].sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity))

  /** Anonymous (read-only guest) module rows are view-only until workspace allows anonymous guests. */
  $: anonymousModulePermissionsReadOnly = guestPermissionsTab === 'anonymous' && !allowReadOnlyGuests

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
    if (anonymousModulePermissionsReadOnly) return
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
    if (anonymousModulePermissionsReadOnly) return
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

  async function handleToggleReadonlyAccess (e: CustomEvent<boolean>): Promise<void> {
    const enabled = e.detail
    const guestUserInfo = await accountClient.updateAllowReadOnlyGuests(enabled)
    allowReadOnlyGuests = enabled
    if (guestUserInfo !== undefined) {
      const guestAccount: Account = {
        uuid: guestUserInfo.guestPerson.uuid as AccountUuid,
        role: AccountRole.ReadOnlyGuest,
        primarySocialId: pickPrimarySocialId(guestUserInfo.guestSocialIds)._id,
        socialIds: guestUserInfo.guestSocialIds.map((si) => si._id),
        fullSocialIds: guestUserInfo.guestSocialIds
      }
      const myAccount = getCurrentAccount()
      const ctx = uiContext.newChild('connect', {})
      await ensureEmployeeForPerson(
        ctx,
        myAccount,
        guestAccount,
        client,
        guestUserInfo.guestSocialIds,
        guestUserInfo.guestPerson
      )
    } else {
      const readonlyEmployee = await client.findOne(contact.mixin.Employee, { personUuid: readOnlyGuestAccountUuid })
      if (readonlyEmployee !== undefined) {
        await client.update(readonlyEmployee, { active: false })
      }
    }
  }

  async function handleToggleGuestSignUp (e: CustomEvent<boolean>): Promise<void> {
    await accountClient.updateAllowGuestSignUp(e.detail)
    allowGuestSignUp = e.detail
  }

  function onReadonlyGuestsToggle (e: CustomEvent<boolean>): void {
    void handleToggleReadonlyAccess(e)
  }

  function onGuestSignUpToggle (e: CustomEvent<boolean>): void {
    void handleToggleGuestSignUp(e)
  }

  async function onAllowedCardsChange (value: Ref<Card>[]): Promise<void> {
    if (existingGuestChatSettings === undefined) {
      await client.createDoc(communication.class.GuestCommunicationSettings, core.space.Workspace, {
        allowedCards: value,
        enabled: true
      })
    } else {
      await client.updateDoc(
        communication.class.GuestCommunicationSettings,
        core.space.Workspace,
        existingGuestChatSettings._id,
        { allowedCards: value, enabled: true }
      )
    }
  }

  defineSeparators('guestPermissionsSettings', twoPanelsSeparators)
</script>

<div class="hulyComponent">
  <Header adaptive={'disabled'}>
    <Breadcrumb
      icon={setting.icon.GuestPermissions}
      label={setting.string.GuestPermissionsSettings}
      size={'large'}
      isCurrent
    />
  </Header>
  <div class="hulyComponent-content__container columns">
    <div class="hulyComponent-content__column navigation py-2">
      <Scroller shrink>
        <NavItem
          icon={contact.icon.Person}
          label={setting.string.GuestPermissionsTabGuest}
          selected={guestPermissionsTab === 'guest'}
          on:click={() => {
            guestPermissionsTab = 'guest'
          }}
        />
        <NavItem
          icon={contact.icon.Persona}
          label={setting.string.GuestPermissionsTabAnonymousGuest}
          selected={guestPermissionsTab === 'anonymous'}
          on:click={() => {
            guestPermissionsTab = 'anonymous'
          }}
        />
      </Scroller>
    </div>

    <Separator name={'guestPermissionsSettings'} index={0} color={'var(--theme-divider-color)'} />

    <div class="hulyComponent-content__column content">
      {#if loading}
        <div class="w-full h-full flex-col-center justify-center">
          <Loading />
        </div>
      {:else}
        <Scroller align={'center'} padding={'var(--spacing-3)'} bottomPadding={'var(--spacing-3)'}>
          <div class="hulyComponent-content guestPermissionsRoot flex-col">
            {#if guestPermissionsTab === 'anonymous'}
              <section class="section">
                <div class="sectionHeader">
                  <div class="sectionTitle">
                    <Label label={settingsRes.string.GuestAccess} />
                  </div>
                </div>
                <div class="guestAccessBlock">
                  <div class="guestAccessRow">
                    <div class="guestAccessRow-label">
                      <Label label={settingsRes.string.GuestAccessDescription} />
                    </div>
                    <div class="guestAccessRow-toggleCell">
                      <Toggle on={allowReadOnlyGuests} on:change={onReadonlyGuestsToggle} />
                    </div>
                  </div>
                  <div class="guestAccessRow">
                    <div class="guestAccessRow-label">
                      <Label label={settingsRes.string.GuestSignUpDescription} />
                    </div>
                    <div class="guestAccessRow-toggleCell">
                      <Toggle disabled={!allowReadOnlyGuests} on={allowGuestSignUp} on:change={onGuestSignUpToggle} />
                    </div>
                  </div>
                  {#if communicationApiEnabled}
                    <div class="guestAccessRow guestAccessRow--editor">
                      <div class="guestAccessRow-label">
                        <Label label={settingsRes.string.GuestChannelsDescription} />
                      </div>
                      <div class="guestAccessRow-editorCell">
                        <div class="guestAccessRow-editorInner">
                          <Component
                            is={card.component.CardArrayEditor}
                            props={{
                              _class: chat.masterTag.Thread,
                              value:
                                existingGuestChatSettings !== undefined ? existingGuestChatSettings.allowedCards : [],
                              label: settingsRes.string.GuestChannelsArrayLabel,
                              onChange: onAllowedCardsChange
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  {/if}
                </div>
              </section>
            {/if}

            <section class="section">
              <div class="sectionHeader">
                <div class="sectionTitle">
                  <Label label={setting.string.GuestPermissionsApplicationPermissions} />
                </div>
                <div class="sectionHint">
                  {#if guestPermissionsTab === 'anonymous'}
                    <Label label={setting.string.GuestPermissionsAnonymousApplicationHint} />
                  {:else}
                    <Label label={setting.string.GuestPermissionsApplicationPermissionsHint} />
                  {/if}
                </div>
                {#if guestPermissionsTab === 'guest'}
                  <div class="sectionHint">
                    <Label label={core.string.AutoJoinGuestsDescr} />
                  </div>
                  <div class="sectionHint">
                    <Label label={settingsRes.string.GuestAutoJoinAvailableSpacesHint} />
                  </div>
                {:else if guestPermissionsTab === 'anonymous'}
                  <div class="sectionHint">
                    <Label label={settingsRes.string.GuestAnonymousVisibleSpacesHint} />
                  </div>
                {/if}
              </div>

              <div class="cardStack" class:cardStack-readonly={anonymousModulePermissionsReadOnly}>
                {#each sortedVisibleModuleGroups as group}
                  {@const app = getApplication(group.application)}
                  {@const moduleOn = isModuleEnabled(group)}
                  {@const permissionCount = (group.permissions ?? []).length}
                  {@const hasGuestAutoJoinRow =
                    guestPermissionsTab === 'guest' &&
                    group.role === AccountRole.Guest &&
                    group.spaceClass !== undefined}
                  {@const hasAnonymousGuestSpacesRow =
                    guestPermissionsTab === 'anonymous' &&
                    group.role === AccountRole.ReadOnlyGuest &&
                    group.spaceClass !== undefined}
                  {@const hasPermissionRowsBlock =
                    permissionCount > 0 || hasGuestAutoJoinRow || hasAnonymousGuestSpacesRow}
                  <div class="permissionModuleCard" class:permissionModuleCard-off={!moduleOn}>
                    <div
                      class="permissionModuleCard-header"
                      class:permissionModuleCard-headerOnly={!hasPermissionRowsBlock}
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
                        <Toggle
                          disabled={anonymousModulePermissionsReadOnly}
                          on={moduleOn}
                          on:change={handleAccessToggle(group)}
                        />
                      </div>
                    </div>

                    {#if hasPermissionRowsBlock}
                      <div class="permissionRows">
                        {#if permissionCount > 0}
                          {#each group.permissions ?? [] as permissionId}
                            <div class="permissionRow">
                              <div class="permissionRow-label">
                                <Label label={getPermissionLabel(permissionId)} />
                              </div>
                              <div class="permissionRow-toggleCell">
                                <Toggle
                                  disabled={!moduleOn || anonymousModulePermissionsReadOnly}
                                  on={isPermissionActive(group, permissionId)}
                                  on:change={handlePermissionToggle(group, permissionId)}
                                />
                              </div>
                            </div>
                          {/each}
                        {/if}
                        {#if hasGuestAutoJoinRow}
                          <div class="permissionRow permissionRow--guestSpaces">
                            <div class="permissionRow-label">
                              <Label label={settingsRes.string.GuestAutoJoinAvailableSpaces} />
                            </div>
                            <div class="permissionRow-editorCell">
                              <AvailableSpacesInput
                                {group}
                                disabled={!moduleOn || anonymousModulePermissionsReadOnly}
                              />
                            </div>
                          </div>
                        {:else if hasAnonymousGuestSpacesRow}
                          <div class="permissionRow permissionRow--guestSpaces">
                            <div class="permissionRow-label">
                              <Label label={settingsRes.string.GuestAnonymousVisibleSpaces} />
                            </div>
                            <div class="permissionRow-editorCell">
                              <AnonymousGuestSpaceInput
                                {group}
                                disabled={!moduleOn || anonymousModulePermissionsReadOnly}
                              />
                            </div>
                          </div>
                        {/if}
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
</div>

<style lang="scss">
  /* Matches packages/ui Toggle width; shared with permission rows and guest access */
  $toggleTrackWidth: 2.25rem;

  .guestPermissionsRoot {
    max-width: 40rem;
    width: 100%;
    margin: 0 auto;
    gap: 2rem;
  }

  .guestAccessBlock {
    display: flex;
    flex-direction: column;
    gap: 0;
    padding-right: 1rem;
    overflow: visible;
  }

  .guestAccessRow {
    display: grid;
    grid-template-columns: minmax(0, 1fr) #{$toggleTrackWidth};
    align-items: center;
    column-gap: 0.75rem;
    min-height: 2.5rem;
    padding: 0.625rem 0 0.625rem 0.25rem;
  }

  .guestAccessRow:not(:first-child) {
    border-top: 1px solid var(--theme-navpanel-divider);
  }

  .guestAccessRow--editor {
    align-items: start;
    min-height: auto;
    padding-top: 0.75rem;
    padding-bottom: 0.75rem;
    overflow: visible;
  }

  /* Same two columns as toggle rows; editor sits in col 2 and grows left so its right edge matches toggles */
  .guestAccessRow--editor .guestAccessRow-editorCell {
    grid-column: 2;
    grid-row: 1;
    justify-self: end;
    align-self: start;
    width: max-content;
    max-width: min(22rem, calc(100vw - 3rem));
    min-width: 0;
    overflow: visible;
  }

  .guestAccessRow-editorInner {
    min-width: 0;
    max-width: 100%;
  }

  .guestAccessRow-label {
    min-width: 0;
    color: var(--theme-content-color);
  }

  .guestAccessRow-toggleCell {
    display: flex;
    justify-content: center;
    align-items: center;
    width: $toggleTrackWidth;
    justify-self: end;
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

  .cardStack {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    padding-top: 0.5rem;
  }

  .cardStack-readonly {
    opacity: 0.85;
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

  .permissionRow--guestSpaces {
    align-items: start;
    min-height: auto;
    padding-top: 0.75rem;
    padding-bottom: 0.75rem;
    grid-template-columns: minmax(0, 1fr) minmax(8rem, max-content);
  }

  .permissionRow--guestSpaces .permissionRow-editorCell {
    grid-column: 2;
    justify-self: end;
    align-self: start;
    width: max-content;
    max-width: min(18rem, calc(100vw - 4rem));
    min-width: 0;
    overflow: visible;
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
