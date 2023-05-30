<script lang="ts">
  import {
    BitrixClient,
    BitrixEntityMapping,
    BitrixFieldMapping,
    defaultSyncPeriod,
    Fields,
    performSynchronization,
    StatusValue,
    toClassRef
  } from '@hcengineering/bitrix'
  import contact from '@hcengineering/contact'
  import core, { Class, Doc, generateId, Ref, Space, WithLookup } from '@hcengineering/core'
  import { getEmbeddedLabel, getMetadata } from '@hcengineering/platform'
  import presentation, { getClient, SpaceSelect } from '@hcengineering/presentation'
  import { Button, CheckBox, Expandable, Icon, IconAdd, IconClose, Label } from '@hcengineering/ui'
  import { DropdownLabels } from '@hcengineering/ui'
  import { EditBox } from '@hcengineering/ui'
  import { NumberEditor } from '@hcengineering/view-resources'
  import bitrix from '../plugin'
  import FieldMappingPresenter from './FieldMappingPresenter.svelte'

  export let mapping: WithLookup<BitrixEntityMapping>
  export let bitrixClient: BitrixClient

  let syncComments = true
  let syncEmails = true
  let syncAttachments = true

  const client = getClient()

  $: fieldMapping = (mapping.$lookup?.fields as BitrixFieldMapping[]) ?? []
  $: fieldsByClass = fieldMapping.reduce((p, c) => {
    p[c.ofClass] = [...(p[c.ofClass] ?? []), c]
    return p
  }, {} as Record<Ref<Class<Doc>>, BitrixFieldMapping[]>)

  let direction: 'ASC' | 'DSC' = 'ASC'
  let limit = 1
  let space: Ref<Space> | undefined
  let syncPeriod = defaultSyncPeriod

  export let loading = false
  let state = ''

  let docsProcessed = 0

  async function doSync (): Promise<void> {
    loading = true
    const uploadUrl = (window.location.origin + getMetadata(presentation.metadata.UploadURL)) as string
    const token = (getMetadata(presentation.metadata.Token) as string) ?? ''

    const mappedFilter: Record<string, any> = {}
    for (const f of filterFields) {
      mappedFilter[f.field] = f.value
    }
    try {
      await performSynchronization({
        bitrixClient,
        client,
        direction,
        limit,
        space,
        mapping,
        loginInfo: {
          token,
          email: '',
          endpoint: ''
        },
        frontUrl: uploadUrl,
        monitor: (total: number) => {
          docsProcessed++
          state = `processed: ${docsProcessed}/${total ?? 1}`
        },
        extraFilter: filterFields.length === 0 ? undefined : mappedFilter,
        syncPeriod,
        syncComments,
        syncEmails,
        syncAttachments
      })
    } catch (err: any) {
      state = err.message
      console.error(err)
    } finally {
      loading = false
    }
  }
  const fieldsKey = bitrix.class.EntityMapping + '.fields.' + mapping._id
  let filterFields: { _id: string; field: string; value: string }[] = []

  const content = JSON.parse(localStorage.getItem(fieldsKey) ?? '[]')

  filterFields = content.filterFields ?? []
  limit = content.limit ?? 1
  direction = content.direction ?? 'ASC'

  $: localStorage.setItem(fieldsKey, JSON.stringify({ limit, filterFields, direction }))

  function addFilter (): void {
    filterFields = [...filterFields, { _id: generateId(), field: '', value: ' ' }]
  }

  let fields: Fields = {}
  bitrixClient.call(mapping.type + '.fields', {}).then((res) => {
    fields = res.result
  })

  let statusList: StatusValue[] = []

  bitrixClient.call('crm.status.list', {}).then((res) => {
    statusList = res.result
  })

  $: items = Object.entries(fields).map((it) => ({
    id: it[0],
    label: `${it[1].formLabel ?? it[1].title}${it[0].startsWith('UF_') ? ' *' : ''} - ${it[0]}`
  }))

  function updateFields (fields: Fields, statusList: StatusValue[]): void {
    // Update fields with status valies if missing.
    for (const f of Object.values(fields)) {
      if (f.type === 'crm_status') {
        f.items = statusList
          .filter((it) => it.ENTITY_ID === f.statusType)
          .map((it) => ({ ID: `${it.STATUS_ID}`, VALUE: it.NAME }))
      }
    }
  }

  $: updateFields(fields, statusList)
</script>

<Expandable label={getEmbeddedLabel(mapping.type)}>
  <svelte:fragment slot="tools">
    <SpaceSelect
      _class={core.class.Space}
      label={core.string.Space}
      bind:value={space}
      on:change={(evt) => {
        space = evt.detail
      }}
      autoSelect
      spaceQuery={{ _id: { $in: [contact.space.Contacts] } }}
    />
    <DropdownLabels
      label={getEmbeddedLabel('Direction')}
      items={[
        { id: 'ASC', label: 'Ascending' },
        { id: 'DSC', label: 'Descending' }
      ]}
      bind:selected={direction}
    />
    <NumberEditor
      kind={'button'}
      value={syncPeriod}
      autoFocus={false}
      placeholder={getEmbeddedLabel('Period')}
      onChange={(val) => {
        if (val) {
          syncPeriod = val
        }
      }}
    />
    <div class="fs-title">
      <NumberEditor
        kind={'button'}
        value={limit}
        autoFocus={false}
        placeholder={getEmbeddedLabel('Limit')}
        onChange={(val) => {
          if (val) {
            limit = val
          }
        }}
      />
    </div>
    <div class="buttons-divider" />
    <Button icon={IconAdd} on:click={addFilter} />
    <div class="buttons-divider" />
    <div class="flex-row-center">
      <div class="p-1">
        {state}
      </div>
      <Button size={'large'} label={getEmbeddedLabel('Synchronize')} {loading} on:click={doSync} />
    </div>
  </svelte:fragment>
  <div class="flex-row flex-grow bottom-divider p-2">
    {#each Object.entries(fieldsByClass) as field, i}
      {@const cl = client.getHierarchy().getClass(toClassRef(field[0]))}
      <div class="fs-title flex-row-center">
        {#if cl.icon}
          <div class="mr-1">
            <Icon icon={cl.icon} size={'large'} />
          </div>
        {/if}
        <Label label={cl.label} />
      </div>
      <div class="flex-row">
        {#each field[1] as cfield, i}
          <div class="fs-title flex-row-center ml-4">
            {i + 1}.
            <FieldMappingPresenter {mapping} value={cfield} />
          </div>
        {/each}
      </div>
    {/each}
  </div>
</Expandable>

<div class="flex-row-center">
  <div class="flex-row-center mr-4">
    <div class="mr-2">Sync comments</div>
    <CheckBox bind:checked={syncComments} />
  </div>
  <div class="flex-row-center mr-4">
    <div class="mr-2">Sync email</div>
    <CheckBox bind:checked={syncEmails} />
  </div>
  <div class="flex-row-center">
    <div class="mr-2">Sync Attachments</div>
    <CheckBox bind:checked={syncAttachments} />
  </div>
</div>
<div class="flex-row-center">
  {#each filterFields as field, pos}
    {@const fValue = fields[field.field]}
    <div class="item flex-row-center">
      <DropdownLabels minW0={false} label={bitrix.string.FieldMapping} {items} bind:selected={field.field} />
      {#if fValue?.type === 'crm_status' || fValue?.type === 'enumeration'}
        <DropdownLabels
          minW0={false}
          label={bitrix.string.FieldMapping}
          items={fValue.items?.map((it) => ({ id: it.ID, label: it.VALUE })) ?? []}
          bind:selected={field.value}
        />
      {:else}
        <EditBox bind:value={field.value} />
      {/if}
      <Button
        icon={IconClose}
        on:click={() => {
          filterFields.splice(pos, 1)
          filterFields = filterFields
        }}
      />
    </div>
  {/each}
</div>
