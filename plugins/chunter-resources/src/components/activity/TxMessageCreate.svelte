<script lang="ts">
  import { TxCreateDoc } from '@hcengineering/core'
  import { Message } from '@hcengineering/chunter'

  export let tx: TxCreateDoc<Message>
</script>

<div class="flex">
  <span>{tx.attributes.content}</span>
</div>
