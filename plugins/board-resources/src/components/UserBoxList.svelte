<script lang="ts">
  import { Employee } from '@hcengineering/contact'
  import { Ref } from '@hcengineering/core'

  import { UserBoxList } from '@hcengineering/presentation'
  import board from '../plugin'

  export let value: Ref<Employee>[]
  export let readonly = false
</script>

<UserBoxList items={value} label={board.string.Members} on:update {readonly} />
