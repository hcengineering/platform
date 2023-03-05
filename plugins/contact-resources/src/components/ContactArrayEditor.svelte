<script lang="ts">
  import { Contact } from '@hcengineering/contact'
  import { Ref } from '@hcengineering/core'
  import { IntlString } from '@hcengineering/platform'
  import ContactList from './ContactList.svelte'

  export let label: IntlString
  export let value: Ref<Contact>[]
  export let onChange: (refs: Ref<Contact>[]) => void
  export let readonly = false

  let timer: any

  function onUpdate (evt: CustomEvent<Ref<Contact>[]>): void {
    clearTimeout(timer)
    timer = setTimeout(() => {
      onChange(evt.detail)
    }, 500)
  }
</script>

<ContactList
  items={value}
  {label}
  on:update={onUpdate}
  kind={'link'}
  size={'medium'}
  justify={'left'}
  width={'100%'}
  {readonly}
/>
