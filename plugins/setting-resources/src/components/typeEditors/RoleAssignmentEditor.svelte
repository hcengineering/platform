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
  import { AccountArrayEditor } from '@hcengineering/contact-resources'
  import { Account, Ref, TypedSpace } from '@hcengineering/core'
  import { IntlString } from '@hcengineering/platform'
  import { ButtonKind, ButtonSize } from '@hcengineering/ui'

  export let object: TypedSpace
  export let label: IntlString
  export let value: Ref<Account>[]
  export let onChange: ((refs: Ref<Account>[]) => void) | undefined
  export let readonly = false
  export let kind: ButtonKind = 'link'
  export let size: ButtonSize = 'large'
  export let width: string | undefined = undefined

  $: members = object?.members ?? []
</script>

<AccountArrayEditor
  {value}
  {label}
  readonly={readonly || (object.private && members.length === 0)}
  includeItems={object.private ? members : undefined}
  {onChange}
  {size}
  width={width ?? 'min-content'}
  {kind}
/>
