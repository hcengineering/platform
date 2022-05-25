<script lang="ts">
  import { CardCover } from '@anticrm/board'
  import { Button } from '@anticrm/ui'

  import ColorPresenter from './ColorPresenter.svelte'
  export let value: CardCover
</script>

<Button kind="link" on:click>
  <ColorPresenter slot="content" value={value.color} size={value.size} />
</Button>
