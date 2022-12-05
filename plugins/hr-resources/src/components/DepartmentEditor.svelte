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
  import { Ref } from '@hcengineering/core'
  import { Department } from '@hcengineering/hr'
  import { IntlString } from '@hcengineering/platform'
  import { SpaceSelector } from '@hcengineering/presentation'
  import { ButtonKind, ButtonSize } from '@hcengineering/ui'
  import hr from '../plugin'

  export let value: Ref<Department> | undefined
  export let label: IntlString = hr.string.ParentDepartmentLabel
  export let onChange: (value: any) => void
  export let kind: ButtonKind = 'no-border'
  export let size: ButtonSize = 'small'
  export let justify: 'left' | 'center' = 'center'
  export let width: string | undefined = undefined
</script>

<SpaceSelector
  _class={hr.class.Department}
  {label}
  {size}
  {kind}
  {justify}
  allowDeselect
  {width}
  autoSelect={false}
  focus={false}
  bind:space={value}
  on:change={(e) => onChange(e.detail)}
/>
