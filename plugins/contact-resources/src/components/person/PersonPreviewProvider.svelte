<script lang="ts">
  import { Person } from '@hcengineering/contact'
  import { Ref, WithLookup } from '@hcengineering/core'
  import { tooltip } from '@hcengineering/ui'

  import { personByIdStore } from '../..'
  import { getPreviewPopup } from './utils'

  export let value: Ref<Person> | WithLookup<Person> | null | undefined
  export let showPopup: boolean = true
  export let inline: boolean = false

  $: person = typeof value === 'string' ? ($personByIdStore.get(value) as Person) : (value as Person)
</script>

{#if inline}
  <span class="inline" use:tooltip={getPreviewPopup(person, showPopup)}>
    <slot />
  </span>
{:else}
  <div class="flex" use:tooltip={getPreviewPopup(person, showPopup)}>
    <slot />
  </div>
{/if}

<style lang="scss">
  .inline {
    display: inline-block;
  }
</style>
