<script lang="ts">
    import { getClient } from '@hcengineering/presentation'
    import type { Interview } from '@hcengineering/recruit'
    import recruit from '@hcengineering/recruit'
    import recruitPlg from '../plugin'
    import { Icon, tooltip } from '@hcengineering/ui'
    import { DocNavLink } from '@hcengineering/view-resources'
  
    export let value: Interview
    export let inline: boolean = false
    export let disabled: boolean = false
    export let noUnderline: boolean = false
    export let accent: boolean = false
  
    const client = getClient()
    const shortLabel = value && client.getHierarchy().getClass(value._class).shortLabel
  </script>
  
  {#if value && shortLabel}
    <DocNavLink object={value} {inline} {disabled} {noUnderline} {accent}>
      {#if inline}
        <span class="antiMention" use:tooltip={{ label: recruitPlg.string.Application }}>
          @{#if shortLabel}{shortLabel}-{/if}{value.number}
        </span>
      {:else}
        <div class="flex-presenter">
          <div class="icon">
            <Icon icon={recruit.icon.Application} size={'small'} />
          </div>
          <span class="label nowrap" class:no-underline={noUnderline || disabled} class:fs-bold={accent}>
            {#if shortLabel}{shortLabel}-{/if}{value.number}
          </span>
        </div>
      {/if}
    </DocNavLink>
  {/if}