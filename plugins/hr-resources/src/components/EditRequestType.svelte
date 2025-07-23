<script lang="ts">
  import { Ref } from '@hcengineering/core'
  import { Request, RequestType } from '@hcengineering/hr'
  import presentation, { Card, getClient } from '@hcengineering/presentation'
  import { DropdownLabelsIntl, Label } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import hr from '../plugin'

  const dispatch = createEventDispatcher()
  export let object: Request

  const ptoRequestTypes = [hr.ids.PTO, hr.ids.PTO2, hr.ids.Sick, hr.ids.Vacation]
  const overtimeRequestTypes = [hr.ids.Overtime, hr.ids.Overtime2]

  const client = getClient()
  const types: RequestType[] = client.getModel().findAllSync(hr.class.RequestType, {})
  const type = types.find((t) => t._id === object.type)

  const typeRefs =
    type !== undefined
      ? ptoRequestTypes.includes(type._id)
        ? ptoRequestTypes
        : overtimeRequestTypes.includes(type._id)
          ? overtimeRequestTypes
          : [type._id]
      : []

  const typesToChange: RequestType[] = typeRefs
    .map((t) => types.find((x) => t === x._id))
    .filter((p): p is RequestType => p !== undefined)

  let newType: RequestType | undefined = type

  function typeSelected (_id: Ref<RequestType>): void {
    newType = types.find((p) => p._id === _id)
  }

  async function changeType (): Promise<void> {
    if (newType !== undefined && newType._id !== type?._id) {
      await client.update(object, {
        type: newType._id
      })
    }
  }
</script>

{#if object && type?.label}
  <Card
    label={hr.string.EditRequestType}
    labelProps={{ type: type.label }}
    canSave={typesToChange !== undefined && newType?._id !== type._id}
    okAction={changeType}
    okLabel={presentation.string.Save}
    on:close={() => {
      dispatch('close')
    }}
    on:changeContent
  >
    <svelte:fragment slot="header">
      <Label label={type.label} />
    </svelte:fragment>
    <div class="mr-3 flex-row-center flex-gap-3">
      {#if typesToChange !== undefined}
        <Label label={hr.string.ChooseNewType} />
        <DropdownLabelsIntl
          selected={newType?._id}
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
