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
  import { AccountArrayEditor, personRefByAccountUuidStore } from '@hcengineering/contact-resources'
  import { type AccountUuid, TypedSpace, notEmpty } from '@hcengineering/core'
  import { IntlString } from '@hcengineering/platform'
  import { ButtonKind, ButtonSize } from '@hcengineering/ui'

  export let object: TypedSpace | undefined
  export let label: IntlString
  export let value: AccountUuid[]
  export let onChange: ((refs: AccountUuid[]) => void) | undefined
  export let readonly = false
  export let kind: ButtonKind = 'link'
  export let size: ButtonSize = 'large'
  export let width: string | undefined = undefined

  $: persons = (object?.members ?? []).map((m) => $personRefByAccountUuidStore.get(m)).filter(notEmpty)
</script>

{#if object !== undefined}
  <AccountArrayEditor
    {value}
    {label}
    readonly={readonly || persons.length === 0}
    includeItems={persons}
    {onChange}
    {size}
    width={width ?? 'min-content'}
    {kind}
  />
{/if}
