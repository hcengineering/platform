<script lang="ts">
  import contact, { Employee } from '@anticrm/contact'
  import { Ref } from '@anticrm/core'

  import { UserBoxList } from '@anticrm/presentation'
  import board from '../plugin'

  export let value: Ref<Employee>[]
</script>

<UserBoxList items={value} _class={contact.class.Employee} label={board.string.Members} />
