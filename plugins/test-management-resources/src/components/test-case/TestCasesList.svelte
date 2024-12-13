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
  import { Icon, Label, Loading, Scroller } from '@hcengineering/ui'
  import { Viewlet, ViewletPreference } from '@hcengineering/view'
  import { TableBrowser, ViewletsSettingButton } from '@hcengineering/view-resources'

  import testManagement from '../../plugin'

  export let query: DocumentQuery<Doc> = {}
  let testCases: number

  const docQuery = createQuery()
  $: docQuery.query(testManagement.class.TestCase, query, (res) => {
    testCases = res.length
  })

  let viewlet: Viewlet | undefined
  let preference: ViewletPreference | undefined
  let loading = true
</script>

<!--TODO: Finish implementation-->
<div class="antiSection max-h-125 clear-mins">
  <div class="antiSection-header">
    <div class="antiSection-header__icon">
      <Icon icon={testManagement.icon.TestCase} size={'small'} />
    </div>
    <span class="antiSection-header__title">
      <Label label={testManagement.string.TestCases} />
    </span>
    <div class="flex-row-center gap-2 reverse">
      <ViewletsSettingButton
        viewletQuery={{ _id: testManagement.viewlet.TableTestCase }}
        kind={'tertiary'}
        bind:viewlet
        bind:preference
        bind:loading
      />
    </div>
  </div>
  {#if testCases > 0}
    {#if viewlet !== undefined && !loading}
      <Scroller horizontal>
        <TableBrowser
          _class={testManagement.class.TestCase}
          config={preference?.config ?? viewlet.config}
          {query}
          loadingProps={{ length: testCases }}
          enableChecking={true}
          readonly={true}
        />
      </Scroller>
    {:else}
      <Loading />
    {/if}
  {/if}
</div>
