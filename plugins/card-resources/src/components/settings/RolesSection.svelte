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
  import { MasterTag, Role, Tag } from '@hcengineering/card'
  import contact from '@hcengineering/contact'
  import core from '@hcengineering/core'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { clearSettingsStore, settingsStore } from '@hcengineering/setting-resources'
  import { ButtonIcon, Icon, IconAdd, Label, showPopup } from '@hcengineering/ui'
  import { onDestroy } from 'svelte'
  import card from '../../plugin'
  import CreateRolePopup from './CreateRolePopup.svelte'

  export let masterTag: MasterTag | Tag

  const client = getClient()

  const ancestors = client.getHierarchy().getAncestors(masterTag._id)

  let roles = client.getModel().findAllSync(card.class.Role, { attachedTo: { $in: ancestors } })
  const query = createQuery()
  query.query(card.class.Role, { attachedTo: { $in: ancestors } }, (res) => {
    roles = res
  })

  function addRole (): void {
    showPopup(CreateRolePopup, { masterTag }, undefined, (res) => {
      if (res != null) {
        $settingsStore = { id: res, component: card.component.EditRole, props: { _id: res } }
      }
    })
  }

  const handleSelect = (role: Role): void => {
    $settingsStore = { id: role._id, component: card.component.EditRole, props: { _id: role._id } }
  }
  onDestroy(() => {
    clearSettingsStore()
  })
</script>

<div class="hulyTableAttr-header font-medium-12">
  <Icon icon={contact.icon.User} size="small" />
  <span><Label label={core.string.Roles} /></span>
  <ButtonIcon kind="primary" icon={IconAdd} size="small" dataId={'btnAdd'} on:click={addRole} />
</div>
<div class="hulyTableAttr-content task">
  {#each roles as role}
    <button
      class="hulyTableAttr-content__row justify-start"
      on:click|stopPropagation={() => {
        handleSelect(role)
      }}
    >
      <div class="hulyTableAttr-content__row-label font-medium-14 cursor-pointer">
        {role.name}
      </div>
    </button>
  {/each}
</div>
