<script lang="ts">
  import { Person } from '@hcengineering/contact'
  import { Ref, WithLookup } from '@hcengineering/core'
  import { tooltip } from '@hcengineering/ui'

  import { personByIdStore } from '../..'
  import { getPreviewPopup } from './utils'

  export let value: Ref<Person> | WithLookup<Person> | null | undefined
  export let showPopup: boolean = true

  $: person = typeof value === 'string' ? ($personByIdStore.get(value) as Person) : (value as Person)
</script>

<div class="flex" use:tooltip={getPreviewPopup(person, showPopup)}>
  <slot />
</div>
