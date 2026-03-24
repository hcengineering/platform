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
  import { createQuery, getClient } from '@hcengineering/presentation'
  import workbench, { type Application } from '@hcengineering/workbench'
  import { Breadcrumb, CheckBox, Header, Label, Loading, Scroller } from '@hcengineering/ui'
  import settingsRes from '../plugin'

  let loadingSettings = true
  let loadingPermissions = true
  let loadingApplications = true

  let moduleGroups: ModulePermissionGroup[] = []
  let permissionsMap: Map<Ref<Permission>, Permission> = new Map<Ref<Permission>, Permission>()
  let applicationsMap: Map<Ref<Doc>, Application> = new Map<Ref<Doc>, Application>()

  const client = getClient()
  const moduleGroupsQuery = createQuery()
  const permissionsQuery = createQuery()
  const applicationsQuery = createQuery()

  $: moduleGroupsQuery.query(core.class.ModulePermissionGroup, {}, (res) => {
    moduleGroups = res as unknown as ModulePermissionGroup[]
    loadingSettings = false
  })

  $: permissionsQuery.query(core.class.Permission, {}, (res) => {
    permissionsMap = new Map((res as Permission[]).map((permission) => [permission._id, permission]))
    loadingPermissions = false
  })

  $: applicationsQuery.query(workbench.class.Application, {}, (res) => {
    applicationsMap = new Map((res as Application[]).map((application) => [application._id as Ref<Doc>, application]))
    loadingApplications = false
  })

  $: loading = loadingSettings || loadingPermissions || loadingApplications

  function getApplicationLabel (applicationId: Ref<Doc>): string {
    return applicationsMap.get(applicationId)?.label?.toString() ?? applicationId
  }

  function getSpaceClassLabel (spaceClass: Ref<Class<Doc>>): string {
    try {
      return client.getHierarchy().getClass(spaceClass).label?.toString() ?? spaceClass
    } catch {
      return spaceClass
    }
  }

  function getGroupPermissions (group: ModulePermissionGroup): Set<Ref<Permission>> {
    return new Set(group.permissions ?? [])
  }

  async function togglePermission (
    group: ModulePermissionGroup,
    permissionId: Ref<Permission>,
    checked: boolean
  ): Promise<void> {
    const next = new Set(group.permissions ?? [])
    if (checked) next.add(permissionId)
    else next.delete(permissionId)
    await client.updateDoc(core.class.ModulePermissionGroup, core.space.Workspace, group._id, {
      permissions: Array.from(next)
    } as any)
  }

  async function toggleModule (group: ModulePermissionGroup, checked: boolean): Promise<void> {
    await client.updateDoc(core.class.ModulePermissionGroup, core.space.Workspace, group._id, {
      enabled: checked
    } as any)
  }

  function isModuleEnabled (group: ModulePermissionGroup): boolean {
    return group.enabled ?? true
  }

  function getPermissionLabel (permissionId: Ref<Permission>): string {
    const permission = permissionsMap.get(permissionId)
    return permission?.label?.toString() ?? permissionId
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
        <div class="hulyComponent-content flex-col flex-gap-4">
          <!-- Allowed spaces -->
          <div class="flex-col flex-gap-2">
            <div class="title"><Label label={settingsRes.string.AccountPermissionsModuleAccess} /></div>
            <div class="hint"><Label label={settingsRes.string.AccountPermissionsModuleAccessHint} /></div>
            <div class="flex-col flex-gap-1 mt-2">
              {#each moduleGroups as group}
                <div class="flex-row-center flex-gap-2">
                  <CheckBox
                    checked={isModuleEnabled(group)}
                    on:change={(e) => {
                      void toggleModule(group, e.detail)
                    }}
                  />
                  <span>{getApplicationLabel(group.application)}</span>
                </div>
              {/each}
              {#if moduleGroups.length === 0}
                <span class="hint">—</span>
              {/if}
            </div>
          </div>

          <div class="flex-col flex-gap-3 mt-4">
            <div class="title"><Label label={settingsRes.string.AccountPermissionsModulePermissions} /></div>
            <div class="hint"><Label label={settingsRes.string.AccountPermissionsAllowedPermissionsHint} /></div>
            {#each moduleGroups.filter((group) => isModuleEnabled(group)) as group}
              <div class="flex-col flex-gap-2 mt-2">
                <div class="title">{getApplicationLabel(group.application)}</div>
                <div class="hint mt-1">{getSpaceClassLabel(group.spaceClass)}</div>
                <div class="flex-col flex-gap-1">
                  {#each group.permissions ?? [] as permissionId}
                    <div class="flex-row-center flex-gap-2 mt-1">
                      <CheckBox
                        checked={getGroupPermissions(group).has(permissionId)}
                        on:change={(e) => {
                          void togglePermission(group, permissionId, e.detail)
                        }}
                      />
                      <span>{getPermissionLabel(permissionId)}</span>
                    </div>
                  {/each}
                  {#if (group.permissions ?? []).length === 0}
                    <span class="hint">—</span>
                  {/if}
                </div>
                {#if (group.permissions ?? []).length === 0}
                  <span class="hint">—</span>
                {/if}
              </div>
            {/each}
            {#if moduleGroups.filter((group) => isModuleEnabled(group)).length === 0}
              <span class="hint">—</span>
            {/if}
          </div>
        </div>
      </Scroller>
    {/if}
  </div>
</div>

<style lang="scss">
  .title {
    font-weight: 500;
    font-size: 1rem;
  }

  .hint {
    font-size: 0.8rem;
    color: var(--theme-halfcontent-color);
  }
</style>
