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
  import { AttributeEditor, createQuery, getClient } from '@hcengineering/presentation'
  import core, { Ref, Role } from '@hcengineering/core'
  import { ButtonIcon, IconSettings, IconAdd, Label, Scroller } from '@hcengineering/ui'

  import settingRes from '../../plugin'

  // export let spaceType: SpaceType
  export let objectId: Ref<Role>
  export let name: string | undefined

  const client = getClient()

  let role: Role | undefined
  const roleQuery = createQuery()
  $: roleQuery.query(core.class.Role, { _id: objectId }, (res) => {
    ;[role] = res
  })
  $: name = role?.name

  function handleAddPermission (): void {
    // TODO
  }
</script>

{#if role !== undefined}
  <div class="hulyComponent-content__container columns">
    <div class="hulyComponent-content__column content">
      <Scroller align={'center'} padding={'var(--spacing-3)'} bottomPadding={'var(--spacing-3)'}>
        <div class="hulyComponent-content gap">
          <div class="hulyComponent-content__column-group mt-4">
            <div class="hulyComponent-content__header mb-6">
              <AttributeEditor _class={core.class.Role} object={role} key="name" editKind="modern-ghost-large" />
            </div>

            <div class="hulyTableAttr-container">
              <div class="hulyTableAttr-header font-medium-12">
                <IconSettings size="small" />
                <span><Label label={settingRes.string.Permissions} /></span>
                <ButtonIcon kind="primary" icon={IconAdd} size="small" on:click={handleAddPermission} />
              </div>
            </div>
          </div>
        </div>
      </Scroller>
    </div>
  </div>
{/if}
