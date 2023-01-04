<script lang="ts">
  import { BitrixEntityMapping, BitrixFieldMapping, MappingOperation, Fields } from '@hcengineering/bitrix'
  import core, { AnyAttribute } from '@hcengineering/core'
  import { getEmbeddedLabel } from '@hcengineering/platform'
  import { getClient } from '@hcengineering/presentation'
  import { Button, eventToHTMLElement, IconDelete, Menu, showPopup, Action, IconEdit } from '@hcengineering/ui'
  import bitrix from '../plugin'
  import CreateMappingAttribute from './CreateMappingAttribute.svelte'
  export let mapping: BitrixEntityMapping
  export let fieldMapping: BitrixFieldMapping[]
  export let fields: Fields
  export let attribute: AnyAttribute

  $: mappedField = fieldMapping.find((it) => it.attributeName === attribute.name)

  const client = getClient()

  const allowed = new Set([
    core.class.TypeString,
    core.class.TypeMarkup,
    core.class.TypeBoolean,
    core.class.TypeDate,
    core.class.TypeNumber,
    core.class.EnumOf,
    core.class.Collection
  ])

  function addMapping (evt: MouseEvent, kind: MappingOperation): void {
    showPopup(
      CreateMappingAttribute,
      {
        mapping,
        attribute,
        fields,
        kind
      },
      'middle'
    )
  }

  $: actions = [
    {
      label: getEmbeddedLabel('Add Copy mapping'),
      action: (_: any, evt: MouseEvent) => {
        addMapping(evt, MappingOperation.CopyValue)
      }
    },
    {
      label: getEmbeddedLabel('Add Tag mapping'),
      action: (_: any, evt: MouseEvent) => {
        addMapping(evt, MappingOperation.CreateTag)
      }
    },
    {
      label: getEmbeddedLabel('Add Channel mapping'),
      action: (_: any, evt: MouseEvent) => {
        addMapping(evt, MappingOperation.CreateChannel)
      }
    },
    {
      label: getEmbeddedLabel('Add Download Attachment mapping'),
      action: (_: any, evt: MouseEvent) => {
        addMapping(evt, MappingOperation.DownloadAttachment)
      }
    }
  ] as Action[]
</script>

<div class="flex-row-center">
  {#if mappedField !== undefined}
    <Button
      icon={IconEdit}
      on:click={(evt) => {
        showPopup(
          CreateMappingAttribute,
          {
            mapping,
            attribute,
            fields,
            field: mappedField
          },
          'middle'
        )
      }}
    />
    <Button
      icon={IconDelete}
      on:click={() => {
        if (mappedField) {
          client.remove(mappedField)
        }
      }}
    />
  {:else if allowed.has(attribute.type._class)}
    <Button
      label={bitrix.string.MapField}
      on:click={(evt) => {
        showPopup(
          Menu,
          {
            actions
          },
          eventToHTMLElement(evt)
        )
      }}
    />
  {/if}
</div>
