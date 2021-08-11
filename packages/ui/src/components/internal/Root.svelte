<script lang="ts">
  import { onDestroy } from 'svelte'
  import { OK } from '@anticrm/platform'
  import { PlatformEvent, addEventListener } from '@anticrm/platform'
  import type { AnyComponent } from '../../types'
  // import { applicationShortcutKey } from '../../utils'
  import { location } from '../../location'

  import { Theme } from '@anticrm/theme'
  import Component from '../Component.svelte'

  import StatusComponent from './Status.svelte'
  import Clock from './Clock.svelte'
  // import Mute from './icons/Mute.svelte'
  import WiFi from './icons/WiFi.svelte'
  import ThemeSelector from './ThemeSelector.svelte'
  import FontSizeSelector from './FontSizeSelector.svelte'
  
  let application: AnyComponent | undefined

  onDestroy(location.subscribe((loc) => {
    if (loc.path[0]) {
      application = loc.path[0] as AnyComponent
    }
  }))

  let status = OK

  addEventListener(PlatformEvent, async (_event, _status) => {
    status = _status
  })
</script>

<Theme>
  <div id="ui-root" class="relative flex flex-col h-screen">
    <div class="status-bar">
      <div class="flex items-center h-full content-color">
        <div class="flex-grow text-center">
          <StatusComponent {status} />
        </div>
        <div class="flex flex-row-reverse items-center">
          <div class="clock">
            <Clock />
          </div>
          <div class="widget">
            <ThemeSelector />
          </div>
          <div class="widget">
            <FontSizeSelector />
          </div>
          <div class="widget">
            <WiFi size={'small'}/>
          </div>
        </div>
      </div>
    </div>
    <div class="app">
      {#if application}
        <Component is={application} props={{}} />
      {:else}
        <div class="error">
          Application not found: {application}
        </div>
      {/if}
    </div>
  </div>
</Theme>

<style lang="scss">
  $status-bar-height: 32px;

  #ui-root {
    .status-bar {
      min-height: $status-bar-height;
      min-width: 1200px;
      font-size: 14px;

      .clock {
        margin: 0 40px 0 24px;
        font-weight: 500;
        font-size: 12px;
        user-select: none;
      }
      .widget {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        opacity: .6;
      }
    }

    .app {
      height: calc(100vh - #{$status-bar-height});
      min-width: 1200px;
      min-height: 600px;

      .error {
        margin-top: 45vh;
        text-align: center;
      }
    }
  }
</style>
