<script lang="ts">
  import presentation, { Card, createQuery, getClient } from '@hcengineering/presentation'
  import hr from '../plugin'
  import { createEventDispatcher } from 'svelte'
  import { DropdownLabelsIntl, Label } from '@hcengineering/ui'
  import { RequestType } from '@hcengineering/hr'
  import { Ref } from '@hcengineering/core'

  const dispatch = createEventDispatcher()
  export let object: Request
  let types: RequestType[] = []
  let type: RequestType | undefined
  let newType: RequestType | undefined
  let typesToChange: (RequestType | undefined)[] | undefined
  const typesQuery = createQuery()
  const client = getClient()

  $: typesQuery.query(hr.class.RequestType, {}, (res) => {
    types = res
    if (object !== undefined && object.type !== undefined) {
      type = types.find((t) => t._id === object.type)
      typesToChange = requestPairMap.get(type?._id)?.map((t) => types.find((x) => t === x._id))
      if (typesToChange !== undefined) {
        newType = typesToChange[0]
      }
    }
  })
  const requestPairMap: Map<Ref<RequestType>, Array<Ref<RequestType>>> = new Map([
    [hr.ids.PTO, [hr.ids.PTO2, hr.ids.Sick, hr.ids.Vacation]],
    [hr.ids.PTO2, [hr.ids.PTO]],
    [hr.ids.Overtime, [hr.ids.Overtime2]],
    [hr.ids.Overtime2, [hr.ids.Overtime]]
  ])

  function typeSelected (_id: Ref<RequestType>): void {
    newType = types.find((p) => p._id === _id)
  }
  async function changeType () {
    await client.updateCollection(
      hr.class.Request,
      object.space,
      object._id,
      object.attachedTo,
      object.attachedToClass,
      object.collecttion,
      {
        type: newType._id
      }
    )
  }
</script>

{#if object && type && type.label}
  <Card
    label={hr.string.EditRequestType}
    labelProps={{ type: type.label }}
    canSave={typesToChange !== undefined}
    okAction={changeType}
    okLabel={presentation.string.Save}
    on:close={() => {
      dispatch('close')
    }}
    on:changeContent
  >
    <div class="mr-3">
      {#if typesToChange !== undefined}
        <Label label={hr.string.ChooseNewType} />
        <DropdownLabelsIntl
          items={typesToChange.map((p) => {
            return { id: p._id, label: p.label }
          })}
          label={hr.string.RequestType}
          on:selected={(e) => typeSelected(e.detail)}
        />
      {:else}
        <Label label={hr.string.UnchangeableType} />
      {/if}
    </div>
  </Card>
{/if}
