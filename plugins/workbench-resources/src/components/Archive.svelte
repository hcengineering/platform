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
  import core from '@hcengineering/core'
  import { Icon, Label } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import { TableBrowser } from '@hcengineering/view-resources'
  import { NavigatorModel } from '@hcengineering/workbench'
  import workbench from '../plugin'
  import { getSpecialSpaceClass } from '../utils'

  export let model: NavigatorModel | undefined
</script>

<div class="ac-header">
  <div class="ac-header__wrap-title">
    <div class="ac-header__icon"><Icon icon={view.icon.Archive} size={'small'} /></div>
    <div class="ac-header__title"><Label label={workbench.string.Archived} /></div>
  </div>
</div>
{#if model}
  <TableBrowser
    _class={core.class.Space}
    config={['', '_class', 'modifiedOn']}
    showNotification
    baseMenuClass={core.class.Space}
    query={{
      _class: { $in: getSpecialSpaceClass(model) },
      archived: true
    }}
  />
{/if}
