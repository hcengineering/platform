<script lang="ts">
  import { Ref } from '@hcengineering/core'
  import { Request, RequestType } from '@hcengineering/hr'
  import presentation, { Card, getClient } from '@hcengineering/presentation'
  import { DropdownLabelsIntl, Label } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import hr from '../plugin'

  const dispatch = createEventDispatcher()
  export let object: Request

  const requestPairMap = new Map<Ref<RequestType>, Array<Ref<RequestType>>>([
    [hr.ids.PTO, [hr.ids.PTO2, hr.ids.Sick, hr.ids.Vacation]],
    [hr.ids.PTO2, [hr.ids.PTO]],
    [hr.ids.Overtime, [hr.ids.Overtime2]],
    [hr.ids.Overtime2, [hr.ids.Overtime]]
  ])

  const types: RequestType[] = getClient().getModel().findAllSync(hr.class.RequestType, {})
  const type = types.find((t) => t._id === object.type)

  const typesToChange: RequestType[] =
    type !== undefined
      ? (requestPairMap
          .get(type._id)
          ?.map((t) => types.find((x) => t === x._id))
          .filter((p) => p !== undefined) as RequestType[]) ?? []
      : []
  let newType: RequestType | undefined = typesToChange[0]

  function typeSelected (_id: Ref<RequestType>): void {
    newType = types.find((p) => p._id === _id)
  }
  async function changeType () {
    if (newType !== undefined) {
      await getClient().update(object, {
        type: newType._id
      })
    }
  }
</script>

{#if object && type?.label}
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
          on:selected={(e) => {
            typeSelected(e.detail)
          }}
        />
      {:else}
        <Label label={hr.string.UnchangeableType} />
      {/if}
    </div>
  </Card>
{/if}
