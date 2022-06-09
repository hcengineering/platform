<script lang="ts">
  import { Person } from '@anticrm/contact'
  import { Ref } from '@anticrm/core'
  import { IntlString } from '@anticrm/platform'
  import { UserBoxList } from '@anticrm/presentation'
  import contact from '../plugin'

  export let label: IntlString
  export let value: Ref<Person>[]
  export let onChange: (refs: Ref<Person>[]) => void

  let timer: any

  function onUpdate (evt: CustomEvent<Ref<Person>[]>): void {
    clearTimeout(timer)
    timer = setTimeout(() => {
      onChange(evt.detail)
    }, 500)
  }
</script>

<UserBoxList
  _class={contact.class.Employee}
  items={value}
  {label}
  on:update={onUpdate}
  kind={'link'}
  size={'medium'}
  justify={'left'}
  width={'100%'}
/>
