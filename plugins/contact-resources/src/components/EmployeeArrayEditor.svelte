<script lang="ts">
  import { Employee } from '@hcengineering/contact'
  import core, { AccountUuid, AnyAttribute, DocumentQuery, notEmpty, Ref, Space } from '@hcengineering/core'
  import type { ButtonKind, ButtonSize } from '@hcengineering/ui'
  import { IntlString } from '@hcengineering/platform'
  import UserBoxList from './UserBoxList.svelte'
  import { employeeRefByAccountUuidStore } from '..'
  import { getClient } from '@hcengineering/presentation'

  export let label: IntlString
  export let value: Ref<Employee>[]
  export let onChange: (refs: Ref<Employee>[]) => void
  export let readonly = false

  export let kind: ButtonKind = 'link'
  export let size: ButtonSize = 'medium'
  export let width: string | undefined = '100%'
  export let justify: 'left' | 'center' = 'left'
  export let attribute: AnyAttribute | undefined = undefined
  export let space: Ref<Space> | undefined = undefined

  let docQuery: DocumentQuery<Employee> = {
    active: true
  }

  const client = getClient()

  let timer: any

  function onUpdate (evt: CustomEvent<Ref<Employee>[]>): void {
    clearTimeout(timer)
    timer = setTimeout(() => {
      onChange(evt.detail)
    }, 500)
  }

  $: buildQuery(attribute, space)

  async function buildQuery (attribute: AnyAttribute | undefined, space: Ref<Space> | undefined): Promise<void> {
    const baseQuery = {
      active: true
    }
    if (attribute === undefined || space === undefined) {
      docQuery = baseQuery
      return
    }
    if (attribute.spaceMembersOnly === true || attribute.byRole !== undefined) {
      const _space = await client.findOne(core.class.Space, {
        _id: space
      })
      if (_space === undefined) {
        docQuery = baseQuery
        return
      }

      if (attribute.byRole === undefined) {
        const allMembers = _space.members ?? []
        const allPersonsSet = new Set(allMembers.map((p) => $employeeRefByAccountUuidStore.get(p)).filter(notEmpty))

        docQuery = {
          ...baseQuery,
          _id: { $in: Array.from(allPersonsSet) }
        }
      } else {
        const asMixin = client.getHierarchy().as(_space, core.mixin.SpacesTypeData)
        const roleMembers = ((asMixin as any)[attribute.byRole] ?? []) as AccountUuid[]
        const rolePersons = new Set(roleMembers.map((p) => $employeeRefByAccountUuidStore.get(p)).filter(notEmpty))
        docQuery = {
          ...baseQuery,
          _id: { $in: Array.from(rolePersons) }
        }
      }
    }
  }
</script>

<UserBoxList
  items={value}
  {label}
  on:update={onUpdate}
  {kind}
  {size}
  {justify}
  {docQuery}
  width={kind === 'list' ? undefined : width}
  {readonly}
/>
