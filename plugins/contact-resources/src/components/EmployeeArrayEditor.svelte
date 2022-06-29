<script lang="ts">
  import { Employee } from '@anticrm/contact'
  import { Ref } from '@anticrm/core'
  import { IntlString } from '@anticrm/platform'
  import { UserBoxList } from '@anticrm/presentation'

  export let label: IntlString
  export let value: Ref<Employee>[]
  export let onChange: (refs: Ref<Employee>[]) => void

  let timer: any

  function onUpdate (evt: CustomEvent<Ref<Employee>[]>): void {
    clearTimeout(timer)
    timer = setTimeout(() => {
      onChange(evt.detail)
    }, 500)
  }
</script>

<UserBoxList items={value} {label} on:update={onUpdate} kind={'link'} size={'medium'} justify={'left'} width={'100%'} />
