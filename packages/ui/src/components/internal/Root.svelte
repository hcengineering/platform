<script lang="ts">
  import { onDestroy } from 'svelte'
  import { getMetadata, OK } from '@hcengineering/platform'
  import { PlatformEvent, addEventListener } from '@hcengineering/platform'
  import type { AnyComponent } from '../../types'
  // import { applicationShortcutKey } from '../../utils'
  import { getCurrentLocation, location, navigate } from '../../location'

  import { Theme } from '@hcengineering/theme'
  import Component from '../Component.svelte'

  import StatusComponent from '../Status.svelte'
  import Clock from './Clock.svelte'
  // import Mute from './icons/Mute.svelte'
  import WiFi from './icons/WiFi.svelte'
  import ThemeSelector from './ThemeSelector.svelte'
  import FontSizeSelector from './FontSizeSelector.svelte'
  import LangSelector from './LangSelector.svelte'
  import uiPlugin from '../../plugin'
  import { deviceOptionsStore as deviceInfo } from '../../'

  let application: AnyComponent | undefined

  onDestroy(
    location.subscribe((loc) => {
      const routes = getMetadata(uiPlugin.metadata.Routes) ?? new Map()
      const component = loc.path[0]

      application = routes.get(component)
      if (application === undefined && Array.from(routes.values()).includes(component as AnyComponent)) {
        // if component id is used
        application = component as AnyComponent
      }

      if (application === undefined) {
        const last = localStorage.getItem('platform_last_loc')
        if (last !== null) {
          navigate(JSON.parse(last))
        } else {
          application = getMetadata(uiPlugin.metadata.DefaultApplication)
          if (application !== undefined) {
            const loc = getCurrentLocation()
            loc.path = [application]
            navigate(loc)
          }
        }
      }
    })
  )

  let status = OK

  addEventListener(PlatformEvent, async (_event, _status) => {
    status = _status
  })

  let docWidth: number = window.innerWidth
  let docHeight: number = window.innerHeight
  let maxLenght: number
  $: maxLenght = docWidth >= docHeight ? docWidth : docHeight
  let isPortrait: boolean
  $: isPortrait = docWidth <= docHeight
  let isMobile: boolean
  $: isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)

  $: $deviceInfo.docWidth = docWidth
  $: $deviceInfo.docHeight = docHeight
  $: $deviceInfo.isPortrait = isPortrait
  $: $deviceInfo.isMobile = isMobile
</script>

<svelte:window bind:innerWidth={docWidth} bind:innerHeight={docHeight} />

<Theme>
  <div id="ui-root">
    <div class="status-bar">
      <div class="flex-row-center h-full content-color">
        <div
          class="status-info"
          style:margin-left={(isPortrait && docWidth <= 480) || (!isPortrait && docHeight <= 480) ? '1.5rem' : '0'}
        >
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
          <div class="flex-center widget mr-3" class:on={isMobile}>
            <WiFi size={'small'} />
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
  * {
    --status-bar-height: 32px;
  }

  #ui-root {
    position: relative;
    display: flex;
    flex-direction: column;
    height: 100vh;

    .status-bar {
      min-height: var(--status-bar-height);
      height: var(--status-bar-height);
      // min-width: 600px;
      font-size: 12px;
      line-height: 150%;
      background-color: var(--divider-color);

      .status-info {
        flex-grow: 1;
        text-align: center;
      }
      .clock {
        margin: 0 1rem 0 24px;
        font-weight: 500;
        user-select: none;
      }
      .widget {
        width: 16px;
        height: 16px;
        font-size: 14px;
        color: var(--content-color);

        &.on {
          color: var(--caption-color);
        }
      }
    }

    .app {
      height: calc(100vh - var(--status-bar-height));
      // min-width: 600px;
      // min-height: 480px;

      .error {
        margin-top: 45vh;
        text-align: center;
      }
    }
  }
</style>
