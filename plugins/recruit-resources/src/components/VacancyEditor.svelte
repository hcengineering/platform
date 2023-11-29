<!--
// Copyright © 2023 Hardcore Engineering Inc.
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
  import { Ref, RefTo } from '@hcengineering/core'
  import { IntlString } from '@hcengineering/platform'
  import { ButtonKind, ButtonSize } from '@hcengineering/ui'
  import recruit from '../plugin'
  import { Vacancy } from '@hcengineering/recruit'
  import { SpaceSelect } from '@hcengineering/presentation'

  export let value: Ref<Vacancy> | undefined
  export let label: IntlString = recruit.string.Vacancy
  export let onChange: (value: any) => void
  export let type: RefTo<Vacancy> | undefined
  export let kind: ButtonKind = 'no-border'
  export let size: ButtonSize = 'small'
  export let justify: 'left' | 'center' = 'center'
  export let width: string | undefined = undefined
  $: _value = value != null ? value : undefined
  $: _class = type?.to ?? recruit.class.Vacancy
</script>

<SpaceSelect
  {_class}
  {label}
  bind:value={_value}
  {kind}
  {size}
  {justify}
  {width}
  allowDeselect
  autoSelect={false}
  defaultIcon={recruit.icon.Vacancy}
  iconWithEmoji={recruit.icon.Vacancy}
  ignoreFill
  on:change={(e) => {
    onChange(e.detail)
  }}
/>
