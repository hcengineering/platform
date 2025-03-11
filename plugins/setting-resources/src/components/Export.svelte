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
  import { Class, Doc, Ref } from '@hcengineering/core'
  import { getMetadata } from '@hcengineering/platform'
  import presentation, { MessageBox } from '@hcengineering/presentation'
  import { Breadcrumb, Button, DropdownLabelsIntl, Header, Label, Scroller, showPopup } from '@hcengineering/ui'
  import setting from '../plugin'

  const classItems = [
    { id: 'tracker:class:Issue', label: setting.string.ExportIssues },
    { id: 'tracker:class:Milestone', label: setting.string.ExportMilestones },
    { id: 'document:class:Document', label: setting.string.ExportDocuments },
    { id: 'testManagement:class:TestCase', label: setting.string.ExportTestCases },
    { id: 'testManagement:class:TestRun', label: setting.string.ExportTestRuns },
    { id: 'testManagement:class:TestPlan', label: setting.string.ExportTestPlans }
  ]

  const formatItems = [
    { id: 'json', label: setting.string.ExportJSON },
    { id: 'csv', label: setting.string.ExportCSV }
  ]

  const detailLevelItems = [
    { id: 'everything', label: setting.string.ExportEverything },
    { id: 'attributesOnly', label: setting.string.ExportAttributesOnly }
  ]

  let selectedClass: Ref<Class<Doc>> = 'tracker:class:Issue' as Ref<Class<Doc>>
  let selectedFormat: string = 'json'
  let selectedDetailLevel: string = 'everything'
  let isExporting = false

  async function exportData (): Promise<void> {
    if (isExporting) return

    try {
      isExporting = true
      const baseUrl = getMetadata(setting.metadata.ExportUrl) ?? ''
      const token = getMetadata(presentation.metadata.Token) ?? ''
      const attributesOnly = selectedDetailLevel === 'attributesOnly'

      const res = await fetch(
        `${baseUrl}?class=${selectedClass}&type=${selectedFormat}&attributesOnly=${attributesOnly}`,
        {
          method: 'GET',
          headers: {
            Authorization: 'Bearer ' + token,
            'Content-Type': 'application/json'
          }
        }
      )

      if (!res.ok) {
        throw new Error('Export failed to start')
      }

      showPopup(MessageBox, {
        label: setting.string.ExportRequestSuccess,
        kind: 'success',
        message: setting.string.ExportRequestSuccessMessage
      })
    } catch (err) {
      showPopup(MessageBox, {
        label: setting.string.ExportRequestFailed,
        kind: 'error',
        message: setting.string.ExportRequestFailedMessage
      })
    } finally {
      isExporting = false
    }
  }
</script>

<div class="hulyComponent">
  <Header adaptive={'disabled'}>
    <Breadcrumb icon={setting.icon.Export} label={setting.string.Export} size={'large'} isCurrent />
  </Header>
  <div class="hulyComponent-content__column content">
    <Scroller align={'center'} padding={'var(--spacing-3)'} bottomPadding={'var(--spacing-3)'}>
      <div class="hulyComponent-content">
        <div class="flex-row-center p-2 flex-no-shrink">
          <div class="p-1 min-w-80">
            <div class="antiGrid-row">
              <div class="antiGrid-row__header">
                <Label label={setting.string.DataToExport} />
              </div>
              <div class="antiGrid-row__content">
                <DropdownLabelsIntl items={classItems} bind:selected={selectedClass} />
              </div>
            </div>
            <div class="antiGrid-row">
              <div class="antiGrid-row__header">
                <Label label={setting.string.ExportFormat} />
              </div>
              <div class="antiGrid-row__content">
                <DropdownLabelsIntl items={formatItems} bind:selected={selectedFormat} />
              </div>
            </div>
            <div class="antiGrid-row">
              <div class="antiGrid-row__header">
                <Label label={setting.string.ExportIncludeContent} />
              </div>
              <div class="antiGrid-row__content">
                <DropdownLabelsIntl items={detailLevelItems} bind:selected={selectedDetailLevel} />
              </div>
            </div>
          </div>
        </div>
        <div class="flex-row-center p-2">
          <Button
            label={setting.string.Export}
            kind={'primary'}
            size={'medium'}
            disabled={isExporting}
            on:click={exportData}
          />
        </div>
      </div>
    </Scroller>
  </div>
</div>
