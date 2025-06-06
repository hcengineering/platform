<!--
// Copyright © 2025 Hardcore Engineering Inc.
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
  import { MasterTag } from '@hcengineering/card'
  import { Class, Doc, Ref, Space } from '@hcengineering/core'
  import { IntlString } from '@hcengineering/platform'
  import { createQuery } from '@hcengineering/presentation'
  import { location } from '@hcengineering/ui'
  import { SpecialView } from '@hcengineering/workbench-resources'
  import { onDestroy } from 'svelte'
  import card from '../plugin'

  export let currentSpace: Ref<Space>

  let _class: Ref<Class<Doc>> | undefined

  onDestroy(
    location.subscribe((loc) => {
      _class = loc.path[4]
    })
  )

  let allClasses: MasterTag[] = []

  const query = createQuery()
  query.query(card.class.MasterTag, {}, (res) => {
    allClasses = res.filter((it) => it.removed !== true)
  })

  $: clazz = allClasses.find((it) => it._id === _class)

  $: label = getLabel(clazz)

  function getLabel (clazz: MasterTag | undefined): IntlString | undefined {
    return clazz?.label
  }
</script>

{#if clazz !== undefined && label !== undefined}
  <SpecialView
    _class={clazz._id}
    baseQuery={{ space: currentSpace }}
    space={currentSpace}
    {label}
    icon={card.icon.Card}
  />
{/if}
