<!--
// Copyright © 2024 Anticrm Platform Contributors.
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
  import { Doc, DocumentQuery } from '@hcengineering/core'
  import { createQuery } from '@hcengineering/presentation'
  import { Button, Icon, IconAdd, Label, Loading, Scroller, SectionEmpty } from '@hcengineering/ui'
  import { Viewlet, ViewletPreference, ViewOptions } from '@hcengineering/view'
  import { ListView, ViewletsSettingButton, getViewOptions, viewOptionStore } from '@hcengineering/view-resources'

  import testManagement from '../../plugin'
  import FileDuo from '../icons/FileDuo.svelte'

  export let baseQuery: DocumentQuery<Doc> = {}
  let testRunItems: number

  const query = createQuery()
  $: query.query(testManagement.class.TestRunItem, baseQuery, (res) => {
    testRunItems = res.length
  })

  const createTestRunItem = (ev: MouseEvent): void => {
    // showPopup(CreateTestRunItem, { testSuiteId: objectId }, ev.target as HTMLElement)
  }

  let viewlet: Viewlet | undefined
  let preference: ViewletPreference | undefined
  let loading = true
  $: viewOptions = getViewOptions(viewlet, $viewOptionStore)
</script>

<div class="antiSection max-h-125 clear-mins">
  <div class="antiSection-header__pad">
    <div class="antiSection-header__icon">
      <Icon icon={testManagement.icon.TestCase} size={'small'} />
    </div>
    <span class="antiSection-header__title">
      <Label label={testManagement.string.TestCases} />
    </span>
    <div class="flex-row-center gap-2 reverse">
      <ViewletsSettingButton
        viewletQuery={{ _id: testManagement.viewlet.TestRunList }}
        kind={'tertiary'}
        bind:viewlet
        bind:preference
        bind:loading
      />
      <Button id="appls.add" icon={IconAdd} kind={'ghost'} on:click={createTestRunItem} />
    </div>
  </div>
  {#if testRunItems > 0}
    {#if viewlet !== undefined && !loading}
      <Scroller horizontal>
        <ListView
          _class={testManagement.class.TestRunItem}
          config={preference?.config ?? viewlet.config}
          query={baseQuery}
          {viewlet}
          {viewOptions}
        />
      </Scroller>
    {:else}
      <Loading />
    {/if}
  {:else}
    <SectionEmpty icon={FileDuo} label={testManagement.string.NoTestCases}>
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <!-- svelte-ignore a11y-no-static-element-interactions -->
      <Label label={testManagement.string.NoTestCases} />
    </SectionEmpty>
  {/if}
</div>
