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
  import { createEventDispatcher } from 'svelte'
  import type { AccessLevel } from '@hcengineering/core'
  import { Button, DropdownLabelsIntl, Label, themeStore } from '@hcengineering/ui'
  import type { DropdownIntlItem } from '@hcengineering/ui'
  import { translate, type IntlString } from '@hcengineering/platform'
  import presentation from '@hcengineering/presentation'
  import tracker from '../../../plugin'

  // Name(s) of the grantee(s) — joined by the caller when multiple. For a group
  // grant this is the group name and `isGroup` is set (adds the auto-access hint).
  export let personName: string
  export let issueTitle: string
  export let initialLevel: AccessLevel = 'read'
  export let isGroup: boolean = false
  export let memberCount: number = 0

  let level: AccessLevel = initialLevel

  const levelName: Record<AccessLevel, IntlString> = {
    read: tracker.string.LevelRead,
    write: tracker.string.LevelWrite,
    admin: tracker.string.LevelAdmin
  }

  const dispatch = createEventDispatcher()

  const levelItems: DropdownIntlItem[] = [
    { id: 'read', label: tracker.string.LevelRead },
    { id: 'write', label: tracker.string.LevelWrite },
    { id: 'admin', label: tracker.string.LevelAdmin }
  ]

  $: warningLabel =
    level === 'admin'
      ? tracker.string.AccessGrantWarningAdmin
      : level === 'write'
        ? tracker.string.AccessGrantWarningWrite
        : tracker.string.AccessGrantWarningRead

  let levelText = ''
  $: void translate(levelName[level], {}, $themeStore.language).then((t) => {
    levelText = t
  })

  function onCancel (): void {
    dispatch('close', undefined) // undefined => caller treats as cancel
  }

  function onConfirm (): void {
    dispatch('close', level)
  }
</script>

<div class="msgbox-container">
  <div class="overflow-label fs-title mb-4">
    <Label label={tracker.string.GrantAccessTitle} />
  </div>

  <div class="flex-row-center mb-4">
    <span class="mr-2"><Label label={tracker.string.AccessLevelLabel} /></span>
    <DropdownLabelsIntl
      items={levelItems}
      selected={level}
      label={tracker.string.AccessLevelLabel}
      on:selected={(e) => {
        level = e.detail
      }}
    />
  </div>

  <div class="mb-4">
    <Label label={warningLabel} params={{ name: personName, issue: issueTitle }} />
  </div>

  {#if isGroup}
    <div class="mb-4 group-hint">
      <div><Label label={tracker.string.GroupMembersCount} params={{ count: memberCount }} /></div>
      <div><Label label={tracker.string.GroupAccessAutoHint} params={{ level: levelText }} /></div>
    </div>
  {/if}

  <div class="flex-row-reverse mt-4">
    <Button label={tracker.string.GrantAccessConfirm} kind="primary" on:click={onConfirm} />
    <div class="mr-2">
      <Button label={presentation.string.Cancel} on:click={onCancel} />
    </div>
  </div>
</div>

<style lang="scss">
  .msgbox-container {
    display: flex;
    flex-direction: column;
    padding: 1rem;
    min-width: 20rem;
    max-width: 30rem;
  }
  .group-hint {
    font-size: 0.8125rem;
    color: var(--theme-dark-color);
  }
</style>
