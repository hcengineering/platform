<script lang="ts">
  import core, { Account, Ref } from '@hcengineering/core'
  import { ObjectPresenter } from '@hcengineering/view-resources'

  export let reactionAccounts: Ref<Account>[]
</script>

<div class="m-2 flex-col flex-gap-2">
  {#each reactionAccounts as acc}
    <ObjectPresenter objectId={acc} _class={core.class.Account} disabled />
  {/each}
</div>
