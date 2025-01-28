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
  import { Ref, isOwnerOrMaintainer } from '@hcengineering/core'
  import { createQuery } from '@hcengineering/presentation'
  import { ClassAttributes, ClassHierarchy, clearSettingsStore } from '@hcengineering/setting-resources'
  import {
    Breadcrumb,
    Button,
    Header,
    NavGroup,
    Scroller,
    Separator,
    defineSeparators,
    getLocation,
    navigate,
    showPopup,
    twoPanelsSeparators
  } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import card from '../plugin'
  import CreateTag from './CreateTag.svelte'

  const canEdit = isOwnerOrMaintainer()
  const loc = getLocation()

  let _class: Ref<MasterTag> | undefined = loc.query?._class as Ref<MasterTag> | undefined

  $: if (_class !== undefined) {
    const loc = getLocation()
    loc.query = undefined
    navigate(loc, true)
  }

  const clQuery = createQuery()

  let masterTags: Ref<MasterTag>[] = []

  clQuery.query(
    card.class.MasterTag,
    {
      extends: card.class.Card
    },
    (res) => {
      masterTags = res.map((x) => x._id)
    }
  )

  function createMasterTag (): void {
    showPopup(CreateTag, {
      parent: undefined,
      _class: card.class.MasterTag
    })
  }

  defineSeparators('workspaceSettings', twoPanelsSeparators)
</script>

<div class="hulyComponent">
  <Header adaptive={'disabled'}>
    <Breadcrumb icon={card.icon.MasterTags} label={card.string.MasterTags} size={'large'} isCurrent />
  </Header>
  <div class="hulyComponent-content__container columns">
    <div class="hulyComponent-content__column">
      <div class="ulyComponent-content__navHeader flex-between trans-title flex-no-shrink bottom-divider p-3">
        <Button
          icon={view.icon.Add}
          label={card.string.CreateMasterTag}
          justify={'left'}
          width={'100%'}
          on:click={createMasterTag}
        />
      </div>
      <Scroller>
        <NavGroup
          label={card.string.MasterTags}
          highlighted={_class !== undefined}
          categoryName={'classes'}
          noDivider
          isFold
        >
          <ClassHierarchy
            classes={masterTags}
            {_class}
            ofClass={undefined}
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
            <ClassAttributes {_class} disabled={!canEdit} />
          {/if}
        </div>
      </Scroller>
    </div>
  </div>
</div>
