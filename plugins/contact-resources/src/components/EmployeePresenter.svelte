<script lang="ts">
  import { Employee } from '@anticrm/contact'
  import EmployeeStatusPresenter from './EmployeeStatusPresenter.svelte'
  import PersonPresenter from '../components/PersonPresenter.svelte'
  import { showPopup } from '@anticrm/ui'
  import EmployeePreviewPopup from './EmployeePreviewPopup.svelte'

  export let value: Employee
  export let shouldShowAvatar: boolean = true

  let container: HTMLElement

  function onEdit (event: MouseEvent) {
    showPopup(
      EmployeePreviewPopup,
      {
        employeeId: value._id,
        space: value.space
      },
      container
    )
  }
</script>

<div bind:this={container} class="container">
  <div class="over-underline">
    <PersonPresenter {value} {onEdit} {shouldShowAvatar} />
  </div>
  <div class="status">
    <EmployeeStatusPresenter employeeId={value._id} />
  </div>
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
