<script lang="ts">
  import { Employee } from '@hcengineering/contact'
  import { Ref } from '@hcengineering/core'
  import { IntlString } from '@hcengineering/platform'
  import UserBoxList from './UserBoxList.svelte'

  export let label: IntlString
  export let value: Ref<Employee>[]
  export let onChange: (refs: Ref<Employee>[]) => void
  export let readonly = false

  let timer: any

  function onUpdate (evt: CustomEvent<Ref<Employee>[]>): void {
    clearTimeout(timer)
    timer = setTimeout(() => {
      onChange(evt.detail)
    }, 500)
  }
</script>

<UserBoxList
  items={value}
  {label}
  on:update={onUpdate}
  kind={'link'}
  size={'medium'}
  justify={'left'}
  width={'100%'}
  {readonly}
/>
