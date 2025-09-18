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
  import core, { AnyAttribute, Class, Ref, Type } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import { Process } from '@hcengineering/process'
  import { DropdownLabelsIntl, Label, tooltip } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import plugin from '../../plugin'

  export let process: Process
  export let key: string | undefined
  export let type: Type<any> | null | undefined

  const client = getClient()
  const hierarchy = client.getHierarchy()
  const dispatch = createEventDispatcher()
  $: setType(key)

  function setType (key: string | undefined): void {
    const attr = key != null ? hierarchy.findAttribute(process.masterTag, key) : undefined
    if (attr != null) {
      type = attr.type
    } else {
      type = null
    }
    dispatch('change')
  }

  function getKeys (_class: Ref<Class<MasterTag>>): AnyAttribute[] {
    const ignoreKeys = ['_class', 'content', 'parent', 'attachments', 'todos']
    const attributes = hierarchy.getAllAttributes(_class, core.class.Doc)
    const res: AnyAttribute[] = []
    for (const [key, attr] of attributes) {
      if (attr.hidden === true) continue
      if (ignoreKeys.includes(key)) continue
      res.push(attr)
    }
    return res
  }

  const allAttrs = getKeys(process.masterTag)
  const items = allAttrs.map((attr) => {
    return {
      id: attr.name,
      label: attr.label ?? attr.name
    }
  })
</script>

<span
  class="labelOnPanel"
  use:tooltip={{
    props: { label: plugin.string.Attribute }
  }}
>
  <Label label={plugin.string.Attribute} />
</span>
<DropdownLabelsIntl
  label={plugin.string.Attribute}
  {items}
  size={'large'}
  width={'100%'}
  shouldUpdateUndefined={false}
  bind:selected={key}
/>
