<script lang="ts">
  import { BitrixClient, BitrixEntityMapping, Fields, FieldValue } from '@hcengineering/bitrix'
  import core, { DateRangeMode, Enum, Ref } from '@hcengineering/core'
  import { getEmbeddedLabel } from '@hcengineering/platform'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import setting from '@hcengineering/setting-resources/src/plugin'
  import {
    Button,
    DatePresenter,
    EditBox,
    eventToHTMLElement,
    getEventPositionElement,
    Grid,
    IconAdd,
    IconEdit,
    Menu,
    showPopup
  } from '@hcengineering/ui'

  import EnumPopup from './EnumPopup.svelte'

  export let mapping: BitrixEntityMapping
  export let bitrixClient: BitrixClient
  export let fields: Fields = {}

  const client = getClient()

  let items: any[] = []
  function loadItems (order: boolean): void {
    bitrixClient
      .call(mapping.type + '.list', { select: ['*', 'UF_*', 'EMAIL', 'IM'], order: { ID: order ? 'ASC' : 'DSC' } })
      .then((res) => {
        items = res.result
      })
  }

  const enumQuery = createQuery()

  let enums: Enum[] = []
  enumQuery.query(core.class.Enum, {}, (res) => {
    enums = res
  })

  async function updateEnum (evt: MouseEvent, fieldId: string, field: FieldValue): Promise<void> {
    const enumId = ('bitrix_' + fieldId) as Ref<Enum>
    const existingEnum = await client.findOne(core.class.Enum, { _id: enumId })
    if (existingEnum !== undefined) {
      existingEnum.enumValues = [...existingEnum.enumValues, ...(field.items?.map((it) => it.VALUE) ?? [])]
      existingEnum.enumValues = existingEnum.enumValues.filter((it, idx) => existingEnum.enumValues.indexOf(it) === idx)
      showPopup(setting.component.EditEnum, { value: existingEnum }, 'top')
    } else {
      showPopup(
        Menu,
        {
          actions: [
            {
              label: getEmbeddedLabel('New'),
              action: (_: any, evt: MouseEvent) => {
                showPopup(
                  setting.component.EditEnum,
                  {
                    name: 'Bitrix:' + field.formLabel ?? field.title,
                    values: field.items?.map((it) => it.VALUE) ?? [],
                    value: existingEnum
                  },
                  getEventPositionElement(evt)
                )
              }
            },
            {
              label: 'Modify existing',
              component: EnumPopup,
              props: {
                _class: core.class.Enum,
                action: async (existingEnum: Enum) => {
                  if (existingEnum !== undefined) {
                    existingEnum.enumValues = [
                      ...existingEnum.enumValues,
                      ...(field.items?.map((it) => it.VALUE) ?? [])
                    ]
                    existingEnum.enumValues = existingEnum.enumValues.filter(
                      (it, idx) => existingEnum.enumValues.indexOf(it) === idx
                    )
                    showPopup(setting.component.EditEnum, { value: existingEnum }, 'top')
                  }
                }
              }
            }
          ]
        },
        eventToHTMLElement(evt)
      )
    }
  }
  let pattern = ''
</script>

<div class="top-divider">
  <div class="flex gap-2">
    <Button label={getEmbeddedLabel('Load First N values')} on:click={() => loadItems(true)} />
    <Button label={getEmbeddedLabel('Load Last N values')} on:click={() => loadItems(false)} />
  </div>
  <EditBox kind={'search-style'} bind:value={pattern} />
</div>
<div class="p-2 top-divider" style:overflow={'auto'} style:max-height={'40rem'}>
  <Grid column={2} rowGap={1}>
    {#each Object.entries(fields) as kv}
      {@const field = kv[1]}
      {@const title = field.formLabel ?? field.title}
      {#if title.includes(pattern) || field.type.includes(pattern) || pattern.length === 0}
        <span class="fs-title select-text flex-row-center">
          {title} : {field.type}
          <span class="select-text ml-2 mr-2">
            "{kv[0]}"
          </span>
          {#if field.type === 'enumeration' || field.type === 'crm_status'}
            <Button
              icon={enums.find((it) => it._id === 'bitrix_' + kv[0]) ? IconEdit : IconAdd}
              on:click={(evt) => updateEnum(evt, kv[0], field)}
            />
          {/if}
        </span>
        <div class="whitespace-nowrap select-text flex-row-center gap-2">
          {#each items.map((it) => it[kv[0]]).filter((it) => it != null && it !== '') as value}
            <div class="ml-2">
              {#if value !== null && value !== undefined && value !== ''}
                {#if (field.type === 'datetime' || field.type === 'date') && value != null && value !== ''}
                  <DatePresenter
                    value={new Date(value).getTime()}
                    mode={field.type === 'datetime' ? DateRangeMode.DATETIME : DateRangeMode.DATE}
                  />
                {:else if field.type === 'enumeration'}
                  {field.items?.find((it) => it.ID === value)?.VALUE}
                {:else}
                  {JSON.stringify(value)}
                {/if}
              {/if}
            </div>
          {/each}
        </div>
      {/if}
    {/each}
  </Grid>
</div>
