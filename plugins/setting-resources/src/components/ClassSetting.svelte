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
  import core, { Class, Doc, Obj, Ref, isOwnerOrMaintainer } from '@hcengineering/core'
  import { IntlString } from '@hcengineering/platform'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import {
    AnySvelteComponent,
    Scroller,
    ButtonIcon,
    IconDescription,
    Label,
    getLocation,
    navigate,
    Header,
    Breadcrumb,
    defineSeparators,
    twoPanelsSeparators,
    Separator,
    NavGroup
  } from '@hcengineering/ui'
  import setting from '../plugin'
  import { filterDescendants } from '../utils'
  import ClassAttributes from './ClassAttributes.svelte'
  import ClassHierarchy from './ClassHierarchy.svelte'
  import { clearSettingsStore } from '../store'

  export let ofClass: Ref<Class<Obj>> | undefined = undefined
  export let attributeMapper:
  | {
    component: AnySvelteComponent
    label: IntlString
    props: Record<string, any>
  }
  | undefined = undefined
  export let withoutHeader = false
  export let useOfClassAttributes = true

  const canEdit = isOwnerOrMaintainer()

  const loc = getLocation()
  const client = getClient()
  const hierarchy = client.getHierarchy()

  let _class: Ref<Class<Doc>> | undefined = ofClass ?? (loc.query?._class as Ref<Class<Doc>> | undefined)

  $: if (_class !== undefined && ofClass === undefined) {
    const loc = getLocation()
    loc.query = undefined
    navigate(loc, true)
  }

  const clQuery = createQuery()

  let classes: Ref<Class<Doc>>[] = []
  let rawClasses: Class<Doc>[] = []

  clQuery.query(core.class.Class, {}, (res) => {
    rawClasses = res
  })

  $: classes = filterDescendants(hierarchy, ofClass, rawClasses)
  $: if (ofClass !== undefined) {
    // We need to include all possible mixins as well
    for (const ancestor of hierarchy.getAncestors(ofClass)) {
      if (ancestor === ofClass) {
        continue
      }
      const mixins = hierarchy.getDescendants(ancestor).filter((it) => hierarchy.isMixin(it))
      for (const m of mixins) {
        const mm = hierarchy.getClass(m)
        if (
          !classes.includes(m) &&
          mm.extends === ancestor &&
          mm.label !== undefined &&
          client.getHierarchy().hasMixin(mm, setting.mixin.Editable)
        ) {
          // Check if parent of
          classes.push(m)
        }
      }
    }
  }

  $: if (ofClass !== undefined && _class !== undefined && !client.getHierarchy().isDerived(_class, ofClass)) {
    _class = ofClass
  }
  defineSeparators('workspaceSettings', twoPanelsSeparators)
</script>

<div class="hulyComponent">
  {#if !withoutHeader}
    <Header adaptive={'disabled'}>
      <Breadcrumb icon={setting.icon.Clazz} label={setting.string.ClassSetting} size={'large'} isCurrent />
    </Header>
  {/if}
  <div class="hulyComponent-content__container columns">
    <div class="hulyComponent-content__column">
      <div class="hulyComponent-content__navHeader divide">
        <div class="hulyComponent-content__navHeader-menu">
          <ButtonIcon kind={'tertiary'} icon={IconDescription} size={'small'} inheritColor />
        </div>
        <div class="hulyComponent-content__navHeader-hint paragraph-regular-14">
          <Label label={setting.string.ClassSettingHint} />
        </div>
      </div>
      <Scroller>
        <NavGroup
          label={setting.string.Classes}
          highlighted={_class !== undefined}
          categoryName={'classes'}
          noDivider
          isFold
        >
          <ClassHierarchy
            {classes}
            {_class}
            {ofClass}
            on:select={(e) => {
              _class = e.detail
              clearSettingsStore()
            }}
          />
        </NavGroup>
      </Scroller>
    </div>
    <Separator name={'workspaceSettings'} index={0} color={'var(--theme-divider-color)'} />
    <div class="hulyComponent-content__column content">
      <Scroller align={'center'} padding={'var(--spacing-3)'} bottomPadding={'var(--spacing-3)'}>
        <div class="hulyComponent-content">
          {#if _class !== undefined}
            <ClassAttributes {_class} {ofClass} {attributeMapper} disabled={!canEdit} />
          {/if}
        </div>
      </Scroller>
    </div>
  </div>
</div>
