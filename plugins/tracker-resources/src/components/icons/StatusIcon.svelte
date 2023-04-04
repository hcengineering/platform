<script lang="ts">
  import { StatusCategory } from '@hcengineering/core'
  import { IconSize } from '@hcengineering/ui'
  import tracker from '../../plugin'

  export let size: IconSize
  export let fill: string = 'currentColor'
  export let category: StatusCategory
  export let statusIcon: {
    index: number | undefined
    count: number | undefined
  } = { index: 0, count: 0 }
</script>

<svg
  class="svg-{size}"
  {fill}
  id={category._id}
  style:transform={category._id === tracker.issueStatusCategory.Started ? 'rotate(-90deg)' : ''}
  viewBox="0 0 14 14"
  xmlns="http://www.w3.org/2000/svg"
>
  {#if category._id === tracker.issueStatusCategory.Backlog}
    <path
      d="M13.9,7.9l-2-0.3c0-0.2,0-0.4,0-0.7s0-0.4,0-0.7l2-0.3C14,6.4,14,6.7,14,7S14,7.6,13.9,7.9z M13.5,4.3c-0.2-0.6-0.5-1.1-0.9-1.6L11,4c0.3,0.3,0.5,0.7,0.7,1.1L13.5,4.3z M11.3,1.4L10,3C9.7,2.8,9.3,2.5,8.9,2.4l0.8-1.8C10.2,0.8,10.8,1.1,11.3,1.4z M7.9,0.1L7.7,2C7.4,2,7.2,2,7,2S6.6,2,6.3,2l-0.3-2C6.4,0,6.7,0,7,0S7.6,0,7.9,0.1z M4.3,0.5l0.8,1.8C4.7,2.5,4.3,2.8,4,3L2.7,1.4C3.2,1.1,3.8,0.8,4.3,0.5z M1.4,2.7L3,4C2.8,4.3,2.5,4.7,2.4,5.1L0.5,4.3C0.8,3.8,1.1,3.2,1.4,2.7z M0.1,6.1C0,6.4,0,6.7,0,7s0,0.6,0.1,0.9l2-0.3C2,7.4,2,7.2,2,7s0-0.4,0-0.7L0.1,6.1z M0.5,9.7l1.8-0.8C2.5,9.3,2.8,9.7,3,10l-1.6,1.2C1.1,10.8,0.8,10.2,0.5,9.7z M2.7,12.6L4,11c0.3,0.3,0.7,0.5,1.1,0.7l-0.8,1.8C3.8,13.2,3.2,12.9,2.7,12.6z M6.1,13.9l0.3-2c0.2,0,0.4,0,0.7,0s0.4,0,0.7,0l0.3,2C7.6,14,7.3,14,7,14S6.4,14,6.1,13.9z M9.7,13.5l-0.8-1.8c0.4-0.2,0.8-0.4,1.1-0.7l1.2,1.6C10.8,12.9,10.2,13.2,9.7,13.5z M12.6,11.3L11,10c0.3-0.3,0.5-0.7,0.7-1.1l1.8,0.8C13.2,10.2,12.9,10.8,12.6,11.3z"
    />
  {:else if category._id === tracker.issueStatusCategory.Unstarted}
    <path
      d="M7,0C3.1,0,0,3.1,0,7c0,3.9,3.1,7,7,7c3.9,0,7-3.1,7-7C14,3.1,10.9,0,7,0z M7,12c-2.8,0-5-2.2-5-5s2.2-5,5-5s5,2.2,5,5S9.8,12,7,12z"
    />
  {:else if category._id === tracker.issueStatusCategory.Started}
    <path
      d="M7,0C3.1,0,0,3.1,0,7c0,3.9,3.1,7,7,7c3.9,0,7-3.1,7-7C14,3.1,10.9,0,7,0z M7,12c-2.8,0-5-2.2-5-5s2.2-5,5-5s5,2.2,5,5S9.8,12,7,12z"
    />
    {#if statusIcon.count && statusIcon.index}
      <path
        d="M 3.5 3.5 L 7 3.5 A 3.5 3.5 0 {statusIcon.index > (statusIcon.count - 1) / 2 ? 1 : 0} 1 {Math.cos(
          ((2 * Math.PI) / statusIcon.count) * statusIcon.index - 0.01
        ) *
          3.5 +
          3.5} {Math.sin(((2 * Math.PI) / statusIcon.count) * statusIcon.index - 0.01) * 3.5 + 3.5} Z"
        transform="translate(3.5,3.5)"
      />
    {:else}
      <circle cx="7" cy="7" r="3.5" fill="var(--error-color)" opacity=".15" />
    {/if}
  {:else if category._id === tracker.issueStatusCategory.Completed}
    <path
      d="M7,0C3.1,0,0,3.1,0,7c0,3.9,3.1,7,7,7c3.9,0,7-3.1,7-7C14,3.1,10.9,0,7,0z M9.9,3.9c0.3-0.3,0.8-0.3,1.2,0l0,0c0.3,0.3,0.3,0.9,0,1.2l-5,5c-0.3,0.3-0.9,0.3-1.2,0l-2-2c-0.3-0.3-0.3-0.9,0-1.2c0.2-0.2,0.4-0.2,0.6-0.2s0.4,0.1,0.6,0.2l1.4,1.4l4-4v0L9.9,3.9z"
    />
  {:else if category._id === tracker.issueStatusCategory.Canceled}
    <path
      style="fill-rule:evenodd;clip-rule:evenodd;"
      d="M7,14c3.9,0,7-3.1,7-7c0-3.9-3.1-7-7-7C3.1,0,0,3.1,0,7C0,10.9,3.1,14,7,14z M5,4C4.7,3.7,4.3,3.7,4,4S3.7,4.7,4,5l2,2L4,9C3.7,9.3,3.7,9.7,4,10c0.3,0.3,0.8,0.3,1.1,0l2-2l2,2c0.3,0.3,0.8,0.3,1.1,0c0.3-0.3,0.3-0.8,0-1.1l-2-2l2-2c0.3-0.3,0.3-0.8,0-1.1C9.7,3.7,9.3,3.7,9,4l-2,2L5,4z"
    />
  {/if}
</svg>
