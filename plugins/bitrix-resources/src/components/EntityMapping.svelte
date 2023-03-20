<script lang="ts">
  import {
    BitrixClient,
    BitrixEntityMapping,
    BitrixFieldMapping,
    Fields,
    mappingTypes,
    StatusValue,
    toClassRef
  } from '@hcengineering/bitrix'
  import { Class, Doc, Ref } from '@hcengineering/core'
  import { getEmbeddedLabel } from '@hcengineering/platform'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { ClassSetting } from '@hcengineering/setting-resources'
  import { Button, Expandable, Icon, IconAdd, IconDelete, IconEdit, Label, showPopup } from '@hcengineering/ui'
  import bitrix from '../plugin'

  import AttributeMapper from './AttributeMapper.svelte'
  import FieldMappingPresenter from './FieldMappingPresenter.svelte'

  import { CheckBox, DropdownLabelsPopup } from '@hcengineering/ui'
  import { deepEqual } from 'fast-equals'
  import BitrixFieldLookup from './BitrixFieldLookup.svelte'
  import CreateMappingAttribute from './CreateMappingAttribute.svelte'

  export let mapping: BitrixEntityMapping
  export let bitrixClient: BitrixClient
  export let statusList: StatusValue[] = []

  const client = getClient()
  $: ofClass = client.getHierarchy().getClass(mapping.ofClass)

  $: typeTitle = mappingTypes.find((it) => it.id === mapping.type)

  let fields: Fields = {}
  bitrixClient.call(mapping.type + '.fields', {}).then((res) => {
    fields = res.result
  })

  async function updateMappingFields (
    mapping: BitrixEntityMapping,
    fields: Fields,
    statusList: StatusValue[]
  ): Promise<void> {
    if (deepEqual(fields, {})) {
      return // no value resieved yet.
    }
    // Update fields with status valies if missing.
    for (const f of Object.values(fields)) {
      if (f.type === 'crm_status') {
        f.items = statusList
          .filter((it) => it.ENTITY_ID === f.statusType)
          .map((it) => ({ ID: `${it.STATUS_ID}`, VALUE: it.NAME }))
      }
    }

    // Store if changed.
    // TODO: We need to inform about mapping changes and remove old ones.
    if (!deepEqual(mapping.bitrixFields, fields)) {
      await client.update(mapping, { bitrixFields: fields })
    }
  }

  $: updateMappingFields(mapping, fields, statusList)

  const attrs = createQuery()
  let fieldMapping: BitrixFieldMapping[] = []

  $: attrs.query(bitrix.class.FieldMapping, { attachedTo: mapping._id }, (res) => {
    fieldMapping = res
  })

  $: fieldsByClass = fieldMapping.reduce((p, c) => {
    p[c.ofClass] = [...(p[c.ofClass] ?? []), c]
    return p
  }, {} as Record<Ref<Class<Doc>>, BitrixFieldMapping[]>)
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<div class="antiComponent max-w-240 flex-grow p-1">
  <Expandable icon={ofClass?.icon} label={getEmbeddedLabel(typeTitle?.label ?? '')}>
    <svelte:fragment slot="tools">
      <Button icon={IconDelete} on:click={() => client.remove(mapping)} size={'small'} />
    </svelte:fragment>
    <Expandable label={getEmbeddedLabel('Options')}>
      <div class="flex-col">
        <div class="flex-row-center">
          <CheckBox
            bind:checked={mapping.comments}
            on:value={(evt) => client.update(mapping, { comments: evt.detail })}
          />
          <div class="ml-2">
            <Label label={getEmbeddedLabel('Comments')} />
          </div>
        </div>
        <div class="flex-row-center">
          <CheckBox
            bind:checked={mapping.attachments}
            on:value={(evt) => client.update(mapping, { attachments: evt.detail })}
          />
          <div class="ml-2">
            <Label label={getEmbeddedLabel('Attachments')} />
          </div>
        </div>
        <div class="flex-row-center">
          <CheckBox
            bind:checked={mapping.activity}
            readonly
            on:value={(evt) => client.update(mapping, { activity: evt.detail })}
          />
          <div class="ml-2">
            <Label label={getEmbeddedLabel('Activity')} />
          </div>
        </div>
        <div class="flex-row-center">
          <div class="ml-2">
            <Label label={getEmbeddedLabel('Mixins to include')} />
          </div>
          {#each mapping.mixins ?? [] as mixin}
            <div class="flex-row-center p-1 focused-button">
              {mixin}
              <Button
                icon={IconDelete}
                on:click={() => {
                  client.update(mapping, { $pull: { mixins: mixin } })
                }}
              />
            </div>
          {/each}
          <Button
            icon={IconAdd}
            label={getEmbeddedLabel('Add mixin')}
            on:click={async () => {
              const h = client.getHierarchy()
              const mixins = []
              for (const o of h.getAncestors(mapping.ofClass)) {
                const ms = await h.getDescendants(h.getBaseClass(o)).filter((it) => h.isMixin(it))
                for (const m of ms) {
                  if (mixins.indexOf(m) === -1) {
                    mixins.push(m)
                  }
                }
              }

              showPopup(
                DropdownLabelsPopup,
                {
                  items: mixins.map((it) => ({ id: it, label: h.getClass(it).label ?? it }))
                },
                'top',
                (res) => {
                  if (res != null) {
                    client.update(mapping, { $push: { mixins: res } })
                  }
                }
              )
            }}
          />
        </div>
      </div>
    </Expandable>
    <Expandable label={getEmbeddedLabel('Mappings')} expanded>
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
                <Button
                  icon={IconEdit}
                  on:click={(evt) => {
                    showPopup(
                      CreateMappingAttribute,
                      {
                        mapping,
                        attribute: client.getHierarchy().getAttribute(cfield.ofClass, cfield.attributeName),
                        fields,
                        field: cfield
                      },
                      'middle'
                    )
                  }}
                />
              </div>
            {/each}
          </div>
        {/each}
      </div>
    </Expandable>
    <Expandable label={getEmbeddedLabel('Class settings')}>
      <ClassSetting
        ofClass={mapping.ofClass}
        withoutHeader
        attributeMapper={{
          component: AttributeMapper,
          props: { mapping, fields, fieldMapping },
          label: bitrix.string.FieldMapping
        }}
      />
    </Expandable>
    <Expandable label={getEmbeddedLabel('Bitrix field lookup')}>
      <BitrixFieldLookup {mapping} {bitrixClient} {fields} />
    </Expandable>
  </Expandable>
</div>
