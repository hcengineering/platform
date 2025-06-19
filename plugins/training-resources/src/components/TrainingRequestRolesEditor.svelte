<!--
//
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
//
-->

<script lang="ts">
  import core, { Ref, type Role } from '@hcengineering/core'
  import { IntlString } from '@hcengineering/platform'
  import { createQuery } from '@hcengineering/presentation'
  import { Button, type ButtonKind, type ButtonSize, Label, showPopup } from '@hcengineering/ui'
  import training from '../plugin'
  import TrainingRequestRolesEditorPopup from './TrainingRequestRolesEditorPopup.svelte'

  export let value: Ref<Role>[]
  export let onChange: (refs: Ref<Role>[]) => void
  export let readonly = false
  export let emptyLabel: IntlString = training.string.TrainingRequestRoles

  export let kind: ButtonKind = 'link'
  export let size: ButtonSize = 'medium'
  export let width: string | undefined = 'max-content'
  export let justify: 'left' | 'center' = 'left'

  async function onClick (evt: Event): Promise<void> {
    showPopup(
      TrainingRequestRolesEditorPopup,
      {
        selected: value,
        readonly
      },
      evt.target as HTMLElement,
      undefined,
      onChange
    )
  }

  let firstRole: Role | null = null
  const firstRoleQuery = createQuery()
  $: {
    firstRoleQuery.query(
      core.class.Role,
      {
        _id: value[0] ?? 'missing'
      },
      (roles) => {
        firstRole = roles.shift() ?? null
      }
    )
  }
</script>

<Button
  label={value.length === 0 ? emptyLabel : undefined}
  notSelected={value.length === 0}
  width={width ?? 'min-content'}
  {kind}
  {size}
  disabled={readonly}
  {justify}
  on:click={onClick}
>
  <svelte:fragment slot="content">
    {#if value.length > 0}
      <div class="flex-row-center flex-nowrap pointer-events-none">
        {#if value.length === 1 && firstRole !== null}
          {firstRole.name}
        {:else}
          <Label label={training.string.TrainingRequestRolesCount} params={{ count: value.length }} />
        {/if}
      </div>
    {/if}
  </svelte:fragment>
</Button>
