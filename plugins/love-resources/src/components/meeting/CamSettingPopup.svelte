<script lang="ts">
  import { Component, Label, Progress, Toggle } from '@hcengineering/ui'
  import love from '../../plugin'
  import { myPreferences } from '../../stores'
  import { blurProcessor, updateBlurRadius } from '../../utils'
  import mediaPlugin from '@hcengineering/media'

  $: blurRadius = $myPreferences?.blurRadius ?? 0
</script>

<div class="antiPopup mediaPopup">
  <Component is={mediaPlugin.component.MediaPopupCamSelector} />
  {#if blurProcessor !== undefined}
    <div class="grid p-3">
      <Label label={love.string.Blur} />
      <Toggle
        showTooltip={{ label: love.string.BlurTooltip }}
        on={blurRadius >= 0.5}
        on:change={(e) => {
          updateBlurRadius(e.detail ? 0.5 : 0)
        }}
      />
      {#if blurRadius >= 0.5}
        <div class="separator" />
        <Label label={love.string.BlurRadius} />
        <Progress
          editable
          max={10}
          min={0.5}
          value={blurRadius}
          on:change={(e) => {
            const value = Math.round(e.detail * 2) / 2
            updateBlurRadius(value)
          }}
        />
      {/if}
    </div>
  {/if}
</div>

<style lang="scss">
  .mediaPopup {
    width: 20rem;
  }
  .grid {
    display: grid;
    grid-template-columns: 1fr auto;
    row-gap: 1rem;
    column-gap: 1rem;
    align-items: center;
  }
</style>
