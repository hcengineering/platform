<script lang="ts">
  import { BitrixEntityMapping, BitrixEntityType, mappingTypes } from '@hcengineering/bitrix'
  import core, { Class, ClassifierKind, Doc, Obj, Ref } from '@hcengineering/core'
  import { Card, createQuery, getClient } from '@hcengineering/presentation'
  import setting, { Integration } from '@hcengineering/setting'
  import { DropdownLabels } from '@hcengineering/ui'
  import { ObjectBox } from '@hcengineering/view-resources'
  import bitrix from '../plugin'

  export let integration: Integration
  export let mappings: BitrixEntityMapping[]

  const client = getClient()

  async function save (): Promise<void> {
    await client.createDoc<BitrixEntityMapping>(bitrix.class.EntityMapping, bitrix.space.Mappings, {
      ofClass,
      type,
      comments: true,
      attachments: true,
      bitrixFields: {},
      fields: 0,
      activity: false
    })
  }

  $: existingTypes = new Set(mappings.map((it) => it.type))
  $: items = existingTypes !== undefined ? mappingTypes.filter((it) => !existingTypes.has(it.id)) : []

  let type: string = BitrixEntityType.Lead
  let ofClass: Ref<Class<Doc>>

  $: if (items.find((it) => it.id === type) === undefined) {
    type = items[0]?.id ?? ''
  }

  const classQuery = createQuery()

  let _classes: Ref<Class<Doc>>[] = []

  $: classQuery.query(
    core.class.Class,
    {
      label: { $exists: true },
      kind: ClassifierKind.CLASS,
      [setting.mixin.Editable + '.value']: true
    },
    (res) => {
      const withDerived: Ref<Class<Obj>>[] = []
      for (const r of res) {
        withDerived.push(...client.getHierarchy().getDescendants(r._id))
      }
      _classes = withDerived
    }
  )
</script>

<Card label={bitrix.string.AddMapping} canSave={type !== ''} okAction={save} on:close on:changeContent>
  <div class="flex">
    <DropdownLabels label={bitrix.string.BitrixEntityType} {items} bind:selected={type} />
    <ObjectBox
      _class={core.class.Class}
      label={core.string.Class}
      showNavigate={false}
      bind:value={ofClass}
      docQuery={{
        _id: { $in: _classes },
        kind: ClassifierKind.CLASS
      }}
    />
  </div>
</Card>
