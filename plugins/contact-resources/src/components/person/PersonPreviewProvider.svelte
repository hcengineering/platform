<script lang="ts">
  import { Person } from '@hcengineering/contact'
  import { Ref, WithLookup } from '@hcengineering/core'
  import { tooltip } from '@hcengineering/ui'

  import { getPersonByPersonRefStore } from '../..'
  import { getPreviewPopup } from './utils'

  export let value: Ref<Person> | WithLookup<Person> | null | undefined
  export let showPopup: boolean = true
  export let inline: boolean = false

  $: personByRefStore = typeof value === 'string' ? getPersonByPersonRefStore([value]) : undefined
  $: person = typeof value === 'string' ? ($personByRefStore?.get(value) as Person) : (value as Person)
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
