<script lang="ts">
  import {
    BitrixEntityMapping,
    BitrixFieldMapping,
    CreateTagOperation,
    Fields,
    MappingOperation,
    TagField
  } from '@hcengineering/bitrix'
  import { AnyAttribute } from '@hcengineering/core'
  import { getEmbeddedLabel } from '@hcengineering/platform'
  import { getClient } from '@hcengineering/presentation'
  import tags from '@hcengineering/tags'
  import { WeightPopup } from '@hcengineering/tags-resources'
  import {
    Button,
    DropdownLabels,
    DropdownTextItem,
    EditBox,
    getEventPopupPositionElement,
    IconAdd,
    IconDelete,
    showPopup
  } from '@hcengineering/ui'
  import bitrix from '../../plugin'

  export let mapping: BitrixEntityMapping
  export let fields: Fields = {}
  export let attribute: AnyAttribute
  export let field: BitrixFieldMapping | undefined

  let tagFields: TagField[] = [...((field?.operation as CreateTagOperation)?.fields ?? [])]

  const client = getClient()

  export async function save (): Promise<void> {
    if (field !== undefined) {
      await client.update(field, {
        operation: {
          kind: MappingOperation.CreateTag,
          fields: tagFields
        }
      })
    } else {
      await client.addCollection(bitrix.class.FieldMapping, mapping.space, mapping._id, mapping._class, 'fields', {
        ofClass: attribute.attributeOf,
        attributeName: attribute.name,
        operation: {
          kind: MappingOperation.CreateTag,
          fields: tagFields
        }
      })
    }
  }

  function getItems (fields: Fields): DropdownTextItem[] {
    return Object.entries(fields).map((it) => ({
      id: it[0],
      label: `${it[1].formLabel ?? it[1].title}${it[0].startsWith('UF_') ? ' *' : ''} - ${it[0]}`
    }))
  }
  $: items = getItems(fields)

  const tagLevel = [tags.icon.Level1, tags.icon.Level2, tags.icon.Level3]
  const labels = [getEmbeddedLabel('Initial'), getEmbeddedLabel('Meaningfull'), getEmbeddedLabel('Expert')]
</script>

<div class="flex-col flex-wrap">
  {#each tagFields as p, i}
    {@const tagIcon = tagLevel[p.weight % 3]}
    {@const tagLabel = labels[Math.floor(p.weight / 3)]}
    <div class="pattern flex-row-center gap-2">
      <DropdownLabels minW0={false} label={bitrix.string.FieldMapping} {items} bind:selected={p.field} />

      <Button
        label={tagLabel}
        icon={tagIcon}
        on:click={(evt) => {
          showPopup(WeightPopup, { value: p.weight }, getEventPopupPositionElement(evt), (res) => {
            if (Number.isFinite(res) && res >= 0 && res <= 8) {
              if (res != null) {
                p.weight = res
              }
            }
          })
        }}
      />

      <EditBox
        kind={'editbox'}
        bind:value={p.split}
        maxWidth={'5rem'}
        placeholder={getEmbeddedLabel('Separator...')}
        fullSize
      />

      <div class="ml-1">
        <Button
          icon={IconDelete}
          size={'small'}
          on:click={() => {
            tagFields.splice(i, 1)
            tagFields = tagFields
          }}
        />
      </div>
    </div>
  {/each}
  <div class="ml-2">
    <Button
      icon={IconAdd}
      size={'small'}
      on:click={() => {
        tagFields = [...tagFields, { weight: 0, field: items[0].id, split: '' }]
      }}
    />
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
