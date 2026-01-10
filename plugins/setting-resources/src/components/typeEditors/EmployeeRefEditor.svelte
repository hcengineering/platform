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
  import card from '@hcengineering/card'
  import { AnyAttribute, Class, Doc, Ref, Role } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import { DropdownLabels, Label, Toggle } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import setting from '../../plugin'

  export let attributeOf: Ref<Class<Doc>>
  export let attribute: AnyAttribute | undefined
  export let editable: boolean = true
  export let isCard: boolean = false

  const dispatch = createEventDispatcher()
  const client = getClient()

  let spaceMembersOnly: boolean = attribute?.spaceMembersOnly ?? false
  let byRole: Ref<Role> | null | undefined = attribute?.byRole

  function changeSpaceMembersOnly () {
    dispatch('change', { extra: isCard ? { spaceMembersOnly, byRole } : { spaceMembersOnly } })
  }

  function changeByRole (e: any) {
    if (!isCard) return
    byRole = e.detail
    dispatch('change', { extra: isCard ? { spaceMembersOnly, byRole } : { spaceMembersOnly } })
  }

  $: ancestors = client.getHierarchy().getAncestors(attributeOf)

  $: items = client
    .getModel()
    .findAllSync(card.class.Role, { types: { $in: ancestors } })
    .map((role) => ({
      label: role.name,
      id: role._id
    }))
</script>

<span class="label">
  <Label label={setting.string.SpaceMembersOnly} />
</span>
<Toggle bind:on={spaceMembersOnly} on:change={changeSpaceMembersOnly} disabled={!editable} />
{#if isCard}
  <Label label={setting.string.Role} />
  <Toggle on={byRole !== undefined} disabled={!editable} on:change={(e) => (byRole = e.detail ? null : undefined)} />
  {#if byRole !== undefined}
    <Label label={setting.string.Role} />
    <DropdownLabels
      {items}
      autoSelect={false}
      selected={byRole ?? undefined}
      kind={'regular'}
      justify={'left'}
      width={'100%'}
      on:selected={changeByRole}
    />
  {/if}
{/if}
