<script lang="ts">
  import { Employee } from '@anticrm/contact'
  import EmployeeStatusPresenter from './EmployeeStatusPresenter.svelte'
  import PersonPresenter from '../components/PersonPresenter.svelte'
  import { showPopup } from '@anticrm/ui'
  import EmployeePreviewPopup from './EmployeePreviewPopup.svelte'
  import { WithLookup } from '@anticrm/core'

  export let value: WithLookup<Employee>
  export let shouldShowAvatar: boolean = true

  let container: HTMLElement

  function onEdit () {
    showPopup(
      EmployeePreviewPopup,
      {
        employeeId: value._id
      },
      container
    )
  }
</script>

<div bind:this={container} class="flex-center container">
  <div class="pr-2 over-underline">
    <PersonPresenter {value} {onEdit} {shouldShowAvatar} />
  </div>
  {#if value.$lookup?.statuses?.length}
    <div class="status content-color">
      <EmployeeStatusPresenter employee={value} />
    </div>
  {/if}
</div>

<style lang="scss">
  .container {
    width: fit-content;
    margin-bottom: 0.25rem;
  }

  .status {
    font-weight: 400;
    font-size: 0.875rem;
  }
</style>
