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
  import Computer from './icons/Computer.svelte'
  import Phone from './icons/Phone.svelte'
  import ThemeSelector from './ThemeSelector.svelte'
  import FontSizeSelector from './FontSizeSelector.svelte'
  import LangSelector from './LangSelector.svelte'
  import uiPlugin from '../../plugin'
  import { checkMobile, deviceOptionsStore as deviceInfo } from '../../'

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
        const last = localStorage.getItem(`platform_last_loc_${loc.path[1]}`)
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

  let isMobile: boolean
  let alwaysMobile: boolean = false
  $: isMobile = alwaysMobile || checkMobile()
  let isPortrait: boolean
  $: isPortrait = docWidth <= docHeight

  $: $deviceInfo.docWidth = docWidth
  $: $deviceInfo.docHeight = docHeight
  $: $deviceInfo.isPortrait = isPortrait
  $: $deviceInfo.isMobile = isMobile
  $: $deviceInfo.minWidth = docWidth <= 480
  $: $deviceInfo.twoRows = docWidth <= 680

  $: document.documentElement.style.setProperty('--app-height', `${docHeight}px`)

  let doubleTouchStartTimestamp = 0
  document.addEventListener('touchstart', (event) => {
    const now = +new Date()
    if (doubleTouchStartTimestamp + 500 > now) {
      event.preventDefault()
    }
    doubleTouchStartTimestamp = now
  })
  document.addEventListener('dblclick', (event) => {
    event.preventDefault()
  })
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
          <!-- svelte-ignore a11y-click-events-have-key-events -->
          <div
            class="flex-center widget mr-3"
            class:rotated={!isPortrait && isMobile}
            on:click={() => {
              alwaysMobile = !alwaysMobile
              document.documentElement.style.setProperty('--app-height', `${window.innerHeight}px`)
            }}
          >
            <svelte:component
              this={isMobile ? Phone : Computer}
              fill={alwaysMobile ? 'var(--won-color)' : 'var(--content-color)'}
              size={'small'}
            />
          </div>
          <div class="flex-center widget cursor-pointer mr-3">
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
    // height: 100vh;
    height: 100%;
    // height: var(--app-height);

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
        transition: transform 0.15s ease-in-out;

        &.rotated {
          transform-origin: center center;
          transform: rotate(90deg);
        }
      }
    }

    .app {
      height: calc(100% - var(--status-bar-height));
      // min-width: 600px;
      // min-height: 480px;

      .error {
        margin-top: 45vh;
        text-align: center;
      }
    }
  }
</style>
