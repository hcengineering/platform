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
  import { ButtonKind, ButtonSize } from '@hcengineering/ui'
  import { ObjectBox } from '@hcengineering/view-resources'
  import hr from '../plugin'
  import { createQuery } from '@hcengineering/presentation'

  export let value: Ref<Department> | undefined
  export let label: IntlString = hr.string.ParentDepartmentLabel
  export let onChange: (value: any) => void = () => {}
  export let kind: ButtonKind = 'no-border'
  export let size: ButtonSize = 'small'
  export let justify: 'left' | 'center' = 'center'
  export let width: string | undefined = undefined
  export let object: Department | undefined

  let excluded: Ref<Department>[] = []
  let descendants: Map<Ref<Department>, Department[]> = new Map<Ref<Department>, Department[]>()

  $: excluded =
    object !== undefined
      ? descendants
        .get(object._id)
        ?.map((p) => p._id)
        .concat(object._id) ?? [object._id]
      : []

  const q = createQuery()
  $: if (object !== undefined) {
    q.query(hr.class.Department, {}, (res) => {
      descendants.clear()
      for (const doc of res) {
        if (doc.parent !== undefined && doc._id !== hr.ids.Head) {
          const current = descendants.get(doc.parent) ?? []
          current.push(doc)
          descendants.set(doc.parent, current)
        }
      }
      descendants = descendants
    })
  } else {
    q.unsubscribe()
    excluded = []
  }
</script>

<ObjectBox
  _class={hr.class.Department}
  {excluded}
  {label}
  {size}
  {kind}
  {justify}
  {width}
  readonly={value === undefined}
  showNavigate={false}
  autoSelect={false}
  bind:value
  on:change={(e) => {
    onChange(e.detail)
  }}
/>
