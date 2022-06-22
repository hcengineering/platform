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
  import { IssuesDateModificationPeriod, IssuesGrouping, IssuesOrdering, ViewOptions } from '@anticrm/tracker'
  import { Button, eventToHTMLElement, IconDownOutline, showPopup } from '@anticrm/ui'
  import { getViewOptions, setViewOptions } from '@anticrm/view-resources'
  import view, { Viewlet } from '@anticrm/view'

  import ViewOptionsPopup from './ViewOptionsPopup.svelte'
  import { viewOptionsStore } from '../../viewOptions'

  export let viewlet: Viewlet | undefined

  let viewOptions: ViewOptions
  $: if (viewlet) {
    const savedViewOptions = getViewOptions(viewlet._id)
    viewOptions = savedViewOptions
      ? JSON.parse(savedViewOptions)
      : {
          groupBy: IssuesGrouping.Status,
          orderBy: IssuesOrdering.Status,
          completedIssuesPeriod: IssuesDateModificationPeriod.All,
          shouldShowEmptyGroups: false,
          shouldShowSubIssues: false
        }
  }

  $: $viewOptionsStore = viewOptions

  const handleOptionsEditorOpened = (event: MouseEvent) => {
    showPopup(ViewOptionsPopup, viewOptions, eventToHTMLElement(event), undefined, (result) => {
      viewOptions = result
      if (viewlet) setViewOptions(viewlet._id, JSON.stringify(viewOptions))
    })
  }
</script>

<Button
  icon={view.icon.ViewButton}
  kind={'secondary'}
  size={'small'}
  showTooltip={{ label: view.string.CustomizeView }}
  on:click={handleOptionsEditorOpened}
>
  <svelte:fragment slot="content">
    <div class="flex-row-center clear-mins pointer-events-none">
      <span class="text-sm font-medium">View</span>
      <div class="icon"><IconDownOutline size={'full'} /></div>
    </div>
  </svelte:fragment>
</Button>

<style lang="scss">
  .icon {
    margin-left: 0.25rem;
    width: 0.875rem;
    height: 0.875rem;
    color: var(--content-color);
  }
</style>
