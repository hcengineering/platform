<script lang="ts">
  import { AttachedData } from '@hcengineering/core'

  import { Issue } from '@hcengineering/tracker'
  import { floorFractionDigits } from '@hcengineering/ui'
  import BreakpointProgressCircle from './BreakpointProgressCircle.svelte'
  import TimePresenter from './timereport/TimePresenter.svelte'

  export let value: Issue | AttachedData<Issue>
  export let breakpoint: number | undefined = undefined
  export let kind: 'normal' | 'list' = 'normal'

  $: _breakpoint = breakpoint ?? value.breakpoint

  $: childReportTime = floorFractionDigits(
    value.reportedTime + (value.childInfo ?? []).map((it) => it.reportedTime).reduce((a, b) => a + b, 0),
    3
  )
  $: childBreakpointTime = (value.childInfo ?? []).map((it) => it.breakpoint).reduce((a, b) => a + b, 0)
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div class="breakpoint-container" on:click>
  <div class="icon">
    <BreakpointProgressCircle
      value={Math.max(value.reportedTime, childReportTime)}
      max={childBreakpointTime || _breakpoint}
    />
  </div>
  <span class="overflow-label label flex-row-center flex-nowrap {kind}">
    {#if value.reportedTime > 0 || childReportTime > 0}
      {#if childReportTime}
        {@const rchildReportTime = childReportTime}
        {@const reportDiff = floorFractionDigits(rchildReportTime - value.reportedTime, 3)}
        {#if reportDiff !== 0 && value.reportedTime !== 0}
          <div
            class="flex flex-nowrap"
            class:mr-1={kind !== 'list'}
            class:showError={reportDiff > 0 && kind !== 'list'}
          >
            <TimePresenter value={rchildReportTime} />
          </div>
          {#if kind !== 'list'}
            <div class="romColor">
              (<TimePresenter value={value.reportedTime} />)
            </div>
          {/if}
        {:else if value.reportedTime === 0}
          <TimePresenter value={childReportTime} />
        {:else}
          <TimePresenter value={value.reportedTime} />
        {/if}
      {:else}
        <TimePresenter value={value.reportedTime} />
      {/if}
      <span>/</span>
    {/if}
    {#if childBreakpointTime}
      {@const childEstTime = Math.round(childBreakpointTime)}
      {@const breakpointDiff = childEstTime - Math.round(_breakpoint)}
      {#if breakpointDiff !== 0}
        <div
          class="flex flex-nowrap"
          class:mr-1={kind !== 'list'}
          class:showWarning={breakpointDiff !== 0 && kind !== 'list'}
        >
          <TimePresenter value={childEstTime} />
        </div>
        {#if _breakpoint !== 0 && kind !== 'list'}
          <div class="romColor">
            (<TimePresenter value={_breakpoint} />)
          </div>
        {/if}
      {:else}
        <TimePresenter value={_breakpoint} />
      {/if}
    {:else}
      <TimePresenter value={_breakpoint} />
    {/if}
  </span>
</div>

<style lang="scss">
  .breakpoint-container {
    display: flex;
    align-items: center;
    flex-shrink: 0;
    min-width: 0;
    cursor: pointer;

    .icon {
      display: flex;
      justify-content: center;
      align-items: center;
      flex-shrink: 0;
      width: 1rem;
      height: 1rem;
      color: var(--theme-dark-color);
    }
    .label {
      font-size: 0.8125rem;
      margin-left: 0.5rem;

      &.normal {
        color: var(--theme-content-color);
      }
      &.list {
        color: var(--theme-halfcontent-color);
      }
    }
    &:hover {
      .icon {
        color: var(--theme-caption-color) !important;
      }
    }

    .showError {
      color: var(--theme-error-color) !important;
    }
    .showWarning {
      color: var(--theme-warning-color) !important;
    }
    .romColor {
      color: var(--theme-content-color) !important;
    }
  }
</style>
