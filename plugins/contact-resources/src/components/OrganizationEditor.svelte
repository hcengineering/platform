<!--
// Copyright © 2022 Hardcore Engineering Inc.
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
  import { Organization } from '@hcengineering/contact'
  import { Ref } from '@hcengineering/core'
  import { IntlString } from '@hcengineering/platform'
  import UserBox from './UserBox.svelte'
  import type { ButtonKind, ButtonSize } from '@hcengineering/ui'
  import contact from '../plugin'

  export let value: Ref<Organization> | undefined
  export let label: IntlString = contact.string.Organization
  export let onChange: (value: any) => void

  export let kind: ButtonKind = 'no-border'
  export let size: ButtonSize = 'small'
  export let justify: 'left' | 'center' = 'left'
  export let width: string | undefined = 'min-content'
  export let showNavigate = true
</script>

<UserBox
  _class={contact.class.Organization}
  {label}
  {value}
  {kind}
  {size}
  {justify}
  {width}
  allowDeselect
  titleDeselect={contact.string.Cancel}
  on:change={(evt) => {
    onChange(evt.detail)
  }}
  {showNavigate}
/>
