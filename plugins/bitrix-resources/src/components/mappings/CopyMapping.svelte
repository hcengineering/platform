<script lang="ts">
  import {
    BitrixEntityMapping,
    BitrixFieldMapping,
    CopyPattern,
    CopyValueOperation,
    Fields,
    MappingOperation
  } from '@hcengineering/bitrix'
  import core, { AnyAttribute } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import { Button, DropdownLabels, EditBox, IconActivity, IconAdd, IconClose, IconDelete } from '@hcengineering/ui'
  import bitrix from '../../plugin'

  export let mapping: BitrixEntityMapping
  export let fields: Fields = {}
  export let attribute: AnyAttribute
  export let field: BitrixFieldMapping | undefined

  let patterns: CopyPattern[] = [
    ...((field?.operation as CopyValueOperation)?.patterns ?? [
      {
        text: ''
      }
    ])
  ]

  const client = getClient()

  export async function save (): Promise<void> {
    if (field) {
      await client.update(field, {
        operation: {
          kind: MappingOperation.CopyValue,
          patterns
        }
      })
    } else {
      await client.addCollection(bitrix.class.FieldMapping, mapping.space, mapping._id, mapping._class, 'fields', {
        ofClass: attribute.attributeOf,
        attributeName: attribute.name,
        operation: {
          kind: MappingOperation.CopyValue,
          patterns
        }
      })
    }
  }

  $: items = Object.entries(fields)
    .filter((it) => {
      if (attribute.type._class === core.class.EnumOf) {
        return it[1].type === 'enumeration' || it[1].type === 'crm_status'
      }
      return true
    })
    .map((it) => ({
      id: it[0],
      label: `${it[1].formLabel ?? it[1].title}${it[0].startsWith('UF_') ? ' *' : ''} - ${it[0]} - ${it[1].type}`
    }))
</script>

<div class="flex-row-center flex-wrap">
  {#each patterns as p, i}
    <div class="pattern flex-row-center">
      {#if attribute.type._class !== core.class.EnumOf}
        <EditBox kind={'editbox'} bind:value={p.text} maxWidth={'5rem'} fullSize />
      {/if}
      <DropdownLabels minW0={false} label={bitrix.string.FieldMapping} {items} bind:selected={p.field} />
      {#if p.alternatives}
        {#each p.alternatives as alt, i}
          <DropdownLabels minW0={false} label={bitrix.string.FieldMapping} {items} bind:selected={p.alternatives[i]} />
          <Button
            icon={IconClose}
            size={'small'}
            on:click={() => {
              p.alternatives?.splice(i, 1)
              patterns = patterns
            }}
          />
        {/each}
      {/if}
      <div class="ml-1">
        <Button
          icon={IconActivity}
          size={'small'}
          on:click={() => {
            p.alternatives = [...(p.alternatives ?? []), items[0].id]
          }}
        />
        <Button
          icon={IconDelete}
          size={'small'}
          on:click={() => {
            patterns.splice(i, 1)
            patterns = patterns
          }}
        />
      </div>
    </div>
  {/each}
  {#if attribute.type._class !== core.class.EnumOf || patterns.length === 0}
    <div class="ml-2">
      <Button
        icon={IconAdd}
        size={'small'}
        on:click={() => {
          patterns = [...patterns, { text: '', field: undefined }]
        }}
      />
    </div>
  {/if}
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
