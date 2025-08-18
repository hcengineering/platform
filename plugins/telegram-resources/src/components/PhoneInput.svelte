<script lang="ts">
  import { AsYouType } from 'libphonenumber-js'
  import { EditBox } from '@hcengineering/ui'
  import type { IntlString } from '@hcengineering/platform'

  export let value: string = ''
  export let label: IntlString
  export let placeholder: IntlString | undefined = undefined
  export let disabled: boolean = false

  const formatter: AsYouType = new AsYouType()

  function formatPhone (newValue: string | number): string | number {
    newValue = typeof newValue === 'number' ? newValue.toString() : newValue

    // Only allow digits, +, spaces, parentheses, and hyphens
    newValue = newValue.replace(/[^\d+\-()\s]/g, '')

    // Auto-add + prefix if user starts typing a digit and there's no + yet
    if (newValue.length === 1 && /^\d$/.test(newValue)) {
      newValue = '+' + newValue
    }

    // Prevent multiple + signs and ensure + is only at the beginning
    if (newValue.includes('+')) {
      const plusIndex = newValue.indexOf('+')
      if (plusIndex > 0) {
        // Remove + if it's not at the beginning
        newValue = newValue.replace(/\+/g, '')
      } else {
        // Keep only the first + and remove any additional ones
        newValue = '+' + newValue.slice(1).replace(/\+/g, '')
      }
    }

    formatter.reset()
    return formatter.input(newValue)
  }
</script>

<EditBox {label} {placeholder} {disabled} bind:value formatter={formatPhone} />
