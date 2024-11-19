<!--
// Copyright © 2024 Hardcore Engineering Inc.
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
  import {
    Separator,
    deviceOptionsStore as deviceInfo,
    defineSeparators,
    splitViewSeparators
  } from '@hcengineering/ui'

  export let viewName: string = 'parentNavigator'

  defineSeparators('viewName', splitViewSeparators)
</script>

<div class="hulyComponent-content__container columns">
  {#if $deviceInfo.navigator.visible}
    <div
      class="antiPanel-navigator {$deviceInfo.navigator.direction === 'horizontal'
        ? 'portrait'
        : 'landscape'} border-left"
    >
      <slot name="leftPanel"/>
      <Separator
        name={viewName}
        float={$deviceInfo.navigator.float ? 'navigator' : true}
        index={0}
        color={'transparent'}
      />
    </div>

    <Separator
      name={viewName}
      float={$deviceInfo.navigator.float}
      index={0}
      color={'transparent'}
      separatorSize={0}
      short
    />
  {/if}
  <div class="hulyComponent-content__column">
    <slot name="rightPanel"/>
  </div>
</div>
