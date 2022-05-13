<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
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
  import core from '@anticrm/core'
  import { Icon, Label } from '@anticrm/ui'
  import view from '@anticrm/view'
  import { TableBrowser } from '@anticrm/view-resources'
  import { NavigatorModel } from '@anticrm/workbench'
  import workbench from '../plugin'
  import { getSpecialSpaceClass } from '../utils'

  export let model: NavigatorModel | undefined
</script>

<div class="flex-col h-full">
  <div class="flex-row-center header">
    <div class="content-color mr-3"><Icon icon={view.icon.Archive} size={'medium'} /></div>
    <div class="fs-title"><Label label={workbench.string.Archived} /></div>
  </div>
  {#if model}
    <TableBrowser
      _class={core.class.Space}
      config={['', '$lookup._class.label', 'modifiedOn']}
      showNotification
      baseMenuClass={core.class.Space}
      query={{
        _class: { $in: getSpecialSpaceClass(model) },
        archived: true
      }}
    />
  {/if}
</div>

<style lang="scss">
  .header {
    padding: 0 1.75rem 0 2.5rem;
    height: 4rem;
    min-height: 4rem;
  }
</style>
