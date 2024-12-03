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
  import { onMount, onDestroy } from 'svelte'
  import { Button, Loading, Location, navigate } from '@hcengineering/ui'
  import { initializeIterator, testResultIteratorProvider, testIteratorStore } from './store/testIteratorStore'
  import testManagement, { TestResult } from '@hcengineering/test-management'
  import { Doc, type DocumentQuery, WithLookup } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import { getObjectLinkFragment } from '@hcengineering/view-resources'
  import view from '@hcengineering/view'

  export let object: WithLookup<TestResult> | undefined
  let isLoading = true
  let hasNext = false

  const client = getClient()
  const hierarchy = client.getHierarchy()

  const unsubscribe = testIteratorStore.subscribe(() => {
    hasNext = testResultIteratorProvider.getIterator()?.hasNext() ?? false
  })

  onMount(async () => {
    const query: DocumentQuery<TestResult> = { attachedTo: object?.attachedTo } as any
    await initializeIterator(query, object?._id)
    hasNext = testResultIteratorProvider.getIterator()?.hasNext() ?? false
    isLoading = false
  })
  onDestroy(() => {
    testResultIteratorProvider.reset()
    unsubscribe()
  })

  async function goToNextItem (): Promise<void> {
    const iterator = testResultIteratorProvider.getIterator()
    if (iterator !== undefined) {
      const nextItem = iterator.next()
      if (nextItem === undefined) {
        console.error('No next item')
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
    const { component } = hierarchy.classHierarchyMixin(testManagement.class.TestResult, view.mixin.ObjectPanel) as any
    return await getObjectLinkFragment(hierarchy, object, {}, component)
  }
</script>

{#if isLoading}
  <Loading />
{:else}
  <Button
    label={testManagement.string.GoToNextTest}
    kind={'primary'}
    icon={view.icon.ArrowRight}
    disabled={!hasNext}
    on:click={goToNextItem}
    showTooltip={{ label: testManagement.string.GoToNextTestTooltip }}
  />
{/if}
