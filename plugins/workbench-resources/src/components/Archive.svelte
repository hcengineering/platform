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
  import type { Space } from '@anticrm/core'
  import { translate } from '@anticrm/platform'
  import { Label, Icon } from '@anticrm/ui'
  import view from '@anticrm/view'
  import { Table } from '@anticrm/view-resources'
  import { createQuery } from '@anticrm/presentation'
  import { NavigatorModel } from '@anticrm/workbench'

  import workbench from '../plugin'

  export let model: NavigatorModel | undefined
  
  const query = createQuery()
  let spaceSample: Space | undefined
  $: if (model) {
    query.query(
      core.class.Space,
      {
        _class: { $in: model.spaces.map(x => x.spaceClass) },
        archived: true
      },
      (result) => { spaceSample = result[0] },
      { limit: 1 }
    )
  }

  let spaceName = ''
  $: {
    const spaceClass = spaceSample?._class ?? ''
    const spaceModel = model?.spaces.find(x => x.spaceClass == spaceClass)

    const label = spaceModel?.label

    if (label) {
      void translate(label, {}).then((l) => { spaceName = l.toLowerCase() })
    }
  }
</script>

<div class="flex-col h-full">
  <div class="flex-row-center header">
    <div class="content-color mr-3"><Icon icon={view.icon.Archive} size={'medium'} /></div>
    <div class="fs-title"><Label label={workbench.string.Archived} params={{ object: spaceName }} /></div>
  </div>
  {#if spaceSample !== undefined}
  <Table
    _class={spaceSample._class}
    config={['name', 'company', 'location', 'modifiedOn']}
    options={{}}
    enableChecking={true}
    baseMenuClass={core.class.Space}
    query={{
      _class: { $in: model?.spaces.map(x => x.spaceClass) ?? [] },
      archived: true
    }} />
  {/if}
</div>

<style lang="scss">
  .header {
    padding: 0 1.75rem 0 2.5rem;
    height: 4rem;
    min-height: 4rem;
  }
</style>
