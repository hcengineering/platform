<script lang="ts">
  import { Class, Doc, Ref } from '@hcengineering/core'
  import { Button, DropdownLabelsIntl, Header, Breadcrumb, Scroller } from '@hcengineering/ui'
  import setting from '../plugin'

  const classItems = [
    { id: 'tracker:class:Issue', label: 'Issue' },
    { id: 'document:class:Document', label: 'Document' }
  ]

  const typeItems = [
    { id: 'JSON', label: 'JSON' },
    { id: 'CSV', label: 'CSV' }
  ]

  let selectedClass: Ref<Class<Doc>> = 'tracker:class:Issue'
  let selectedType: string = 'JSON'

  async function exportData (): Promise<void> {
    // Export logic will be here
    console.log('Exporting', selectedClass, selectedType)
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
            <!-- label={setting.string.DataToExport} -->
            <div class="antiGrid-row">
              <div class="antiGrid-row__header">
                {'Class to export'}
              </div>
              <div class="antiGrid-row__content">
                <DropdownLabelsIntl
                  items={classItems}
                  bind:selected={selectedClass}
                />
              </div>
            </div>
            <div class="antiGrid-row">
              <div class="antiGrid-row__header">
                {'File type'}
              </div>
              <div class="antiGrid-row__content">
                <DropdownLabelsIntl
                  items={typeItems}
                  bind:selected={selectedType}
                />
              </div>
            </div>
          </div>
        </div>
        <div class="flex-row-center p-2">
          <Button
            label={setting.string.Export}
            kind={'primary'}
            size={'medium'}
            on:click={exportData}
          />
        </div>
      </div>
    </Scroller>
  </div>
</div>
