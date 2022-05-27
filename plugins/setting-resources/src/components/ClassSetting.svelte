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
  import { AnyAttribute, Class, Doc, Ref } from '@anticrm/core'
  import { getCurrentLocation, Icon, Label, navigate } from '@anticrm/ui'
  import setting from '../plugin'
  import ClassAttributes from './ClassAttributes.svelte'
  import ClassHierarchy from './ClassHierarchy.svelte'

  const loc = getCurrentLocation()

  let _class: Ref<Class<Doc>> | undefined = loc.query?._class as Ref<Class<Doc>> | undefined

  $: if (_class !== undefined) {
    const loc = getCurrentLocation()
    loc.query = undefined
    navigate(loc)
  }

  let classes: Ref<Class<Doc>>[] = ['contact:class:Contact' as Ref<Class<Doc>>]

</script>

<div class="antiComponent">
  <div class="ac-header short divide">
    <div class="ac-header__icon"><Icon icon={setting.icon.Setting} size={'medium'} /></div>
    <div class="ac-header__title"><Label label={setting.string.ClassSetting} /></div>
  </div>
  <div class="ac-body columns hScroll">
    <div class="ac-column">
      <div class="overflow-y-auto">
        <ClassHierarchy {classes} {_class} on:select={(e) => {
          _class = e.detail
        }} />
      </div>
    </div>
    <div class="ac-column max">
      {#if _class !== undefined}
        <ClassAttributes {_class} />
      {/if}
    </div>
  </div>
</div>
