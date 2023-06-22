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
  import core, { Class, Doc, Obj, Ref } from '@hcengineering/core'
  import { IntlString } from '@hcengineering/platform'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { AnySvelteComponent, getLocation, Icon, Label, navigate } from '@hcengineering/ui'
  import setting from '../plugin'
  import { filterDescendants } from '../utils'
  import ClassAttributes from './ClassAttributes.svelte'
  import ClassHierarchy from './ClassHierarchy.svelte'

  export let ofClass: Ref<Class<Obj>> | undefined
  export let attributeMapper:
    | {
        component: AnySvelteComponent
        label: IntlString
        props: Record<string, any>
      }
    | undefined
  export let withoutHeader = false

  const loc = getLocation()
  const client = getClient()
  const hierarchy = client.getHierarchy()

  let _class: Ref<Class<Doc>> | undefined = ofClass ?? (loc.query?._class as Ref<Class<Doc>> | undefined)

  $: if (_class !== undefined && ofClass === undefined) {
    const loc = getLocation()
    loc.query = undefined
    navigate(loc)
  }

  const clQuery = createQuery()

  let classes: Ref<Class<Doc>>[] = []
  clQuery.query(core.class.Class, {}, (res) => {
    classes = filterDescendants(hierarchy, ofClass, res)

    if (ofClass !== undefined) {
      // We need to include all possible mixins as well
      for (const ancestor of hierarchy.getAncestors(ofClass)) {
        if (ancestor === ofClass) {
          continue
        }
        const mixins = hierarchy.getDescendants(ancestor).filter((it) => hierarchy.isMixin(it))
        for (const m of mixins) {
          const mm = hierarchy.getClass(m)
          if (!classes.includes(m) && mm.extends === ancestor && mm.label !== undefined) {
            // Check if parent of
            classes.push(m)
          }
        }
      }
    }
  })
</script>

<div class="antiComponent">
  {#if !withoutHeader}
    <div class="ac-header short divide">
      <div class="ac-header__icon"><Icon icon={setting.icon.Clazz} size={'medium'} /></div>
      <div class="ac-header__title"><Label label={setting.string.ClassSetting} /></div>
    </div>
  {/if}
  <div class="ac-body columns hScroll">
    <div class="ac-column">
      <div class="overflow-y-auto">
        <ClassHierarchy
          {classes}
          {_class}
          {ofClass}
          on:select={(e) => {
            _class = e.detail
          }}
        />
      </div>
    </div>
    <div class="ac-column max">
      {#if _class !== undefined}
        <ClassAttributes {_class} {ofClass} {attributeMapper} />
      {/if}
    </div>
  </div>
</div>
