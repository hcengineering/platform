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
  import core, { ArrOf, EnumOf } from '@hcengineering/core'
  import type { IntlString } from '@hcengineering/platform'
  import { createQuery } from '@hcengineering/presentation'
  import { DropdownLabels, DropdownTextItem } from '@hcengineering/ui'

  export let label: IntlString
  export let value: string[] = []
  export let type: ArrOf<string>
  export let onChange: (value: string[]) => void

  let items: DropdownTextItem[] = []

  const query = createQuery()

  query.query(
    core.class.Enum,
    {
      _id: (type.of as EnumOf).of
    },
    (res) => {
      items =
        res[0]?.enumValues?.map((p) => {
          return { id: p, label: p }
        }) ?? []
    },
    { limit: 1 }
  )
</script>

<DropdownLabels
  selected={[...(value ?? [])]}
  {items}
  {label}
  useFlexGrow={true}
  justify={'left'}
  size={'large'}
  kind={'link'}
  width={'100%'}
  multiselect
  autoSelect={false}
  on:selected={(e) => {
    onChange(e.detail)
  }}
/>
