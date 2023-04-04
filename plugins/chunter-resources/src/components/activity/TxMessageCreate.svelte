<script lang="ts">
  import { TxCreateDoc } from '@hcengineering/core'
  import { Message } from '@hcengineering/chunter'
  import { MessageViewer } from '@hcengineering/presentation'

  export let tx: TxCreateDoc<Message>
</script>

<MessageViewer message={tx.attributes.content} />
