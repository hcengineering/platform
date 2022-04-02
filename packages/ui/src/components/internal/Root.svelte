<script lang="ts">
  import { onDestroy } from 'svelte'
  import { getMetadata, OK } from '@anticrm/platform'
  import { PlatformEvent, addEventListener } from '@anticrm/platform'
  import type { AnyComponent } from '../../types'
  // import { applicationShortcutKey } from '../../utils'
  import { getCurrentLocation, location, navigate } from '../../location'

  import { Theme } from '@anticrm/theme'
  import Component from '../Component.svelte'

  import StatusComponent from '../Status.svelte'
  import Clock from './Clock.svelte'
  // import Mute from './icons/Mute.svelte'
  import WiFi from './icons/WiFi.svelte'
  import ThemeSelector from './ThemeSelector.svelte'
  import FontSizeSelector from './FontSizeSelector.svelte'
  import LangSelector from './LangSelector.svelte'
  import uiPlugin from '../../plugin'
  
  let application: AnyComponent | undefined

  onDestroy(location.subscribe((loc) => {
    if (loc.path[0]) {
      application = loc.path[0] as AnyComponent
    }

    if (application === undefined) {
      application = getMetadata(uiPlugin.metadata.DefaultApplication)
      if (application !== undefined) {
        const loc = getCurrentLocation()
        loc.path = [application]
        navigate(loc)
      }
    }
  }))

  let status = OK

  addEventListener(PlatformEvent, async (_event, _status) => {
    status = _status
  })
</script>

<Theme>
  <div id="ui-root">
    <div class="status-bar">
      <div class="flex-row-center h-full content-color">
        <div class="status-info">
          <StatusComponent {status} />
        </div>
        <div class="flex-row-reverse">
          <div class="clock">
            <Clock />
          </div>
          <div class="flex-center widget cursor-pointer">
            <LangSelector />
          </div>
          <div class="flex-center widget cursor-pointer mr-3">
            <ThemeSelector />
          </div>
          <div class="flex-center widget cursor-pointer mr-3">
            <FontSizeSelector />
          </div>
          <div class="flex-center widget mr-3">
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
    position: relative;
    display: flex;
    flex-direction: column;
    height: 100vh;

    .status-bar {
      min-height: $status-bar-height;
      height: $status-bar-height;
      min-width: 1200px;
      font-size: 12px;
      line-height: 150%;
      background-color: var(--divider-color);

      .status-info {
        flex-grow: 1;
        text-align: center;
      }
      .clock {
        margin: 0 40px 0 24px;
        font-weight: 500;
        user-select: none;
      }
      .widget {
        width: 16px;
        height: 16px;
        font-size: 14px;
        color: var(--theme-content-color);
      }
    }

    .app {
      height: calc(100vh - #{$status-bar-height});
      min-width: 1200px;
      min-height: 480px;

      .error {
        margin-top: 45vh;
        text-align: center;
      }
    }
  }
</style>
