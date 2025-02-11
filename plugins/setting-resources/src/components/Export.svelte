<script lang="ts">
  import core, { Class, Doc, Ref } from '@hcengineering/core'
  import { Button, DropdownLabels } from '@hcengineering/ui'
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
    // Здесь будет логика экспорта
    console.log('Exporting', selectedClass, selectedType)
  }
</script>

<div class="flex-col flex-gap-4">
  <div class="flex-row flex-gap-4">
    <DropdownLabels
      label={core.string.Class}
      items={classItems}
      bind:selected={selectedClass}
    />
    <DropdownLabels
      label={setting.string.Type}
      items={typeItems}
      bind:selected={selectedType}
    />
  </div>
  <Button
    label={setting.string.Export}
    primary
    on:click={exportData}
  />
</div>
