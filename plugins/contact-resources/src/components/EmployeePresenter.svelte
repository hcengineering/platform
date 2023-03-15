<script lang="ts">
  import { Employee } from '@hcengineering/contact'
  import { WithLookup } from '@hcengineering/core'
  import { IntlString } from '@hcengineering/platform'
  import { Label } from '@hcengineering/ui'
  import { PersonLabelTooltip } from '..'
  import PersonPresenter from '../components/PersonPresenter.svelte'
  import contact from '../plugin'

  export let value: WithLookup<Employee> | null | undefined
  export let tooltipLabels: PersonLabelTooltip | undefined = undefined
  export let shouldShowAvatar: boolean = true
  export let shouldShowName: boolean = true
  export let shouldShowPlaceholder = false
  export let onEmployeeEdit: ((event: MouseEvent) => void) | undefined = undefined
  export let avatarSize: 'inline' | 'tiny' | 'x-small' | 'small' | 'medium' | 'large' | 'x-large' = 'x-small'
  export let isInteractive = true
  export let inline = false
  export let disableClick = false
  export let defaultName: IntlString | undefined = undefined
  export let element: HTMLElement | undefined = undefined
</script>

<span class="flex-presenter">
  <PersonPresenter
    bind:element
    {value}
    {tooltipLabels}
    onEdit={onEmployeeEdit}
    {shouldShowAvatar}
    {shouldShowName}
    {avatarSize}
    {shouldShowPlaceholder}
    isInteractive={isInteractive && !disableClick}
    {inline}
    {defaultName}
  />
  {#if value?.active === false && shouldShowName}
    <span class="status ml-1">
      (<Label label={contact.string.Inactive} />)
    </span>
  {/if}
</span>

<style lang="scss">
  .status {
    font-weight: 400;
    font-size: 0.875rem;
  }
</style>
