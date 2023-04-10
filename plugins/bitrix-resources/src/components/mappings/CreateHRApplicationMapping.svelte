<script lang="ts">
  import {
    BitrixEntityMapping,
    BitrixFieldMapping,
    CreateHRApplication,
    Fields,
    MappingOperation
  } from '@hcengineering/bitrix'
  import { AnyAttribute } from '@hcengineering/core'
  import { getEmbeddedLabel } from '@hcengineering/platform'
  import { getClient } from '@hcengineering/presentation'
  import task from '@hcengineering/task'
  import { DropdownLabels, DropdownTextItem } from '@hcengineering/ui'
  import { ObjectBox } from '@hcengineering/view-resources'
  import bitrix from '../../plugin'
  import recruit from '@hcengineering/recruit'

  export let mapping: BitrixEntityMapping
  export let fields: Fields = {}
  export let attribute: AnyAttribute
  export let field: BitrixFieldMapping | undefined

  let stateField = (field?.operation as CreateHRApplication)?.stateField
  let vacancyField = (field?.operation as CreateHRApplication)?.vacancyField
  let defaultTemplate = (field?.operation as CreateHRApplication)?.defaultTemplate

  const client = getClient()

  export async function save (): Promise<void> {
    if (field !== undefined) {
      await client.update(field, {
        operation: {
          kind: MappingOperation.CreateHRApplication,
          stateField,
          vacancyField,
          defaultTemplate
        }
      })
    } else {
      await client.addCollection(bitrix.class.FieldMapping, mapping.space, mapping._id, mapping._class, 'fields', {
        ofClass: attribute.attributeOf,
        attributeName: attribute.name,
        operation: {
          kind: MappingOperation.CreateHRApplication,
          stateField,
          vacancyField,
          defaultTemplate
        }
      })
    }
  }

  function getItems (fields: Fields): DropdownTextItem[] {
    return Object.entries(fields).map((it) => ({
      id: it[0],
      label: `${it[1].formLabel ?? it[1].title}${it[0].startsWith('UF_') ? ' *' : ''}`
    }))
  }
  $: items = getItems(fields)
</script>

<div class="flex-col flex-wrap">
  <div class="flex-row-center gap-2">
    <div class="flex-col w-120">
      <DropdownLabels minW0={false} label={getEmbeddedLabel('Vacancy field')} {items} bind:selected={vacancyField} />
      <DropdownLabels minW0={false} label={getEmbeddedLabel('State field')} {items} bind:selected={stateField} />
      <ObjectBox
        label={getEmbeddedLabel('Template')}
        searchField={'title'}
        _class={task.class.KanbanTemplate}
        docQuery={{ space: recruit.space.VacancyTemplates }}
        bind:value={defaultTemplate}
      />
    </div>
  </div>
</div>

<style lang="scss">
  .pattern {
    margin: 0.5rem;
    padding: 0.5rem;
    flex-shrink: 0;
    border: 1px dashed var(--accent-color);
    border-radius: 0.25rem;

    font-weight: 500;
    font-size: 0.75rem;

    // text-transform: uppercase;
    color: var(--accent-color);
    &:hover {
      color: var(--caption-color);
    }
  }
</style>
