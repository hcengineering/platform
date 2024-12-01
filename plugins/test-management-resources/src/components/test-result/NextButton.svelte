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
  import { onMount } from 'svelte'
  import { Button, navigate } from '@hcengineering/ui'
  import { initializeIterator, testResultIteratorProvider } from './store/testIteratorStore'
  import testManagement, { TestResult } from '@hcengineering/test-management'
  import { type DocumentQuery } from '@hcengineering/core'
  import { NavLink, getClient } from '@hcengineering/presentation'
  import { getObjectLinkFragment } from '@hcengineering/view-resources'
  import view from '@hcengineering/view'

  const query: DocumentQuery<TestResult> = { }

  const client = getClient()
  const hierarchy = client.getHierarchy()

  onMount(() => {
    initializeIterator(query)
  })

  async function goToNextItem (): Promise<void> {
    const iterator = testResultIteratorProvider.getIterator()
    if (iterator !== undefined) {
      const nextItem = iterator.getNextObject()
      if (nextItem === undefined) {
        console.log('No next item')
        return
      }
      const link = await getLink(nextItem)
      if (link !== undefined) {
        navigate(link)
      }

      console.log('Next item:', nextItem)
    }
  }

  async function getLink (object: Doc): Promise<Location> {
    const panelComponent = hierarchy.classHierarchyMixin(testManagement.class.TestResult, view.mixin.ObjectPanel)
    const comp = panelComponent?.component ?? component
    return await getObjectLinkFragment(hierarchy, object, {}, comp)
  }
</script>

<Button
  label={testManagement.string.GoToNextTest}
  kind={'primary'}
  icon={view.icon.ArrowRight}
  on:click={goToNextItem}
  showTooltip={{ label: testManagement.string.GoToNextTestTooltip }}
/>
