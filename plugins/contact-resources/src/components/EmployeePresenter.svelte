<script lang="ts">
  import {
    Employee,
    Person,
    extractLeadingStatusEmoji,
    getWorkspaceMemberStatusSubtitle,
    isWorkspaceMemberStatusVisible
  } from '@hcengineering/contact'
  import { Ref, WithLookup } from '@hcengineering/core'
  import { getEmbeddedLabel, IntlString } from '@hcengineering/platform'
  import { getClient } from '@hcengineering/presentation'
  import ui, { IconSize, tooltip } from '@hcengineering/ui'
  import { employeeByIdStore, PersonLabelTooltip } from '..'
  import { workspaceMemberStatusByAccountStore } from '../workspaceMemberStatus'
  import PersonPresenter from '../components/PersonPresenter.svelte'
  import contact from '../plugin'
  import { getPreviewPopup } from './person/utils'

  export let value: Ref<Person> | WithLookup<Person> | null | undefined
  export let showPopup: boolean = true
  export let tooltipLabels: PersonLabelTooltip | undefined = undefined
  export let shouldShowAvatar: boolean = true
  export let shouldShowName: boolean = true
  export let shouldShowPlaceholder = false
  export let onEmployeeEdit: ((event: MouseEvent) => void) | undefined = undefined
  export let avatarSize: IconSize = 'x-small'
  export let disabled = false
  export let inline = false
  export let colorInherit: boolean = false
  export let accent: boolean = false
  export let defaultName: IntlString | undefined = ui.string.NotSelected
  // export let element: HTMLElement | undefined = undefined
  export let noUnderline: boolean = false
  export let compact: boolean = false
  export let showStatus: boolean = false
  export let showWorkspaceStatusEmoji: boolean = true

  const client = getClient()
  const h = client.getHierarchy()

  $: person = typeof value === 'string' ? $employeeByIdStore.get(value as Ref<Employee>) : (value as Person)
  $: employeeValue = person != null ? h.as(person, contact.mixin.Employee) : undefined
  $: active = employeeValue?.active ?? false
  $: statusDoc =
    employeeValue?.personUuid !== undefined
      ? $workspaceMemberStatusByAccountStore.get(employeeValue.personUuid)
      : undefined

  $: statusEmoji = extractLeadingStatusEmoji(statusDoc?.message)

  $: statusTooltip = getWorkspaceMemberStatusSubtitle(statusDoc)
</script>

<div class="employee-presenter">
  <PersonPresenter
    value={employeeValue}
    {tooltipLabels}
    onEdit={onEmployeeEdit}
    customTooltip={getPreviewPopup(employeeValue, showPopup)}
    {shouldShowAvatar}
    {shouldShowName}
    {avatarSize}
    {shouldShowPlaceholder}
    {disabled}
    {inline}
    {colorInherit}
    {accent}
    {defaultName}
    {noUnderline}
    {compact}
    showStatus={showStatus && active}
    statusLabel={!active && shouldShowName && showStatus ? contact.string.Inactive : undefined}
    on:accent-color
  />
  {#if showWorkspaceStatusEmoji && shouldShowName && statusEmoji !== undefined && isWorkspaceMemberStatusVisible(statusDoc)}
    <span
      class="status-emoji"
      use:tooltip={statusTooltip !== undefined ? { label: getEmbeddedLabel(statusTooltip) } : undefined}
    >
      {statusEmoji}
    </span>
  {/if}
</div>

<style lang="scss">
  .employee-presenter {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    max-width: 100%;
  }

  .status-emoji {
    line-height: 1;
    font-size: 0.875rem;
    cursor: default;
  }
</style>
