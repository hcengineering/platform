<script lang="ts">
  import { Button, EditBox, Icon, IconArrowRight, parseURL } from '@hcengineering/ui'
  import calendar from '../plugin'

  export let value: string | undefined
  export let focusIndex = 1

  function isLink (value?: string | null): boolean {
    if (value == null) return false
    const url = parseURL(value)
    return url.startsWith('http://') || url.startsWith('https://')
  }

  function open () {
    if (value == null) return
    const url = parseURL(value)
    if (url.startsWith('http://') || url.startsWith('https://')) {
      window.open(url, '_blank')
    }
  }
</script>

<div class="flex-row-center flex-gap-1 container flex-no-shrink">
  <Icon icon={calendar.icon.Location} size={'small'} />
  <div class="flex-row-center">
    <EditBox bind:value placeholder={calendar.string.Location} kind={'ghost'} {focusIndex} fullSize focusable />
    {#if isLink(value)}
      <div class="tool">
        <Button focusIndex={4} kind={'ghost'} size={'small'} icon={IconArrowRight} on:click={open} />
      </div>
    {/if}
  </div>
</div>

<style lang="scss">
  .tool {
    visibility: hidden;
  }

  .container:hover {
    .tool {
      visibility: visible;
    }
  }
</style>
