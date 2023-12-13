<script lang="ts">
  import contact, { Employee } from '@hcengineering/contact'
  import { Ref } from '@hcengineering/core'

  import { Component } from '@hcengineering/ui'
  import board from '../plugin'

  export let value: Ref<Employee>[]
  export let readonly = false
</script>

<Component
  is={contact.component.UserBoxList}
  props={{ items: value, label: board.string.Members, readonly }}
  on:update
/>
