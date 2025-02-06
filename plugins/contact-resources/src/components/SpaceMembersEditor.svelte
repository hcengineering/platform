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
  import { PersonId, AccountRole, getCurrentAccount, hasAccountRole } from '@hcengineering/core'
  import { IntlString } from '@hcengineering/platform'
  import { Button, ButtonKind, ButtonSize } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import AccountArrayEditor from './AccountArrayEditor.svelte'
  import { includesAny } from '@hcengineering/contact'

  export let label: IntlString
  export let value: PersonId[]
  export let onChange: ((refs: PersonId[]) => void) | undefined
  export let readonly = false
  export let kind: ButtonKind = 'link'
  export let size: ButtonSize = 'large'
  export let width: string | undefined = undefined

  const myPrimaryId = getCurrentAccount().primarySocialId
  const mySocialStrings = getCurrentAccount().socialIds

  $: joined = includesAny(value, mySocialStrings)

  function join (): void {
    if (includesAny(value, mySocialStrings)) return
    if (onChange === undefined) return

    onChange([...value, myPrimaryId])
  }
</script>

{#if !joined && onChange !== undefined}
  <Button label={view.string.Join} {size} {width} kind={'primary'} on:click={join} />
{:else}
  <AccountArrayEditor
    {label}
    {value}
    {onChange}
    readonly={readonly || !hasAccountRole(getCurrentAccount(), AccountRole.User)}
    {kind}
    {size}
    {width}
    allowGuests
  />
{/if}
