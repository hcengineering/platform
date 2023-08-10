<script lang="ts">
  import platform, { addEventListener, getMetadata, OK, PlatformEvent, Status } from '@hcengineering/platform'
  import { onDestroy } from 'svelte'
  import type { AnyComponent, WidthType } from '../../types'
  import { deviceSizes, deviceWidths } from '../../types'
  // import { applicationShortcutKey } from '../../utils'
  import { getCurrentLocation, location, navigate, locationStorageKeyId } from '../../location'

  import { Theme } from '@hcengineering/theme'
  import Component from '../Component.svelte'

  import StatusComponent from '../Status.svelte'
  import Clock from './Clock.svelte'
  // import Mute from './icons/Mute.svelte'
  import { checkMobile, deviceOptionsStore as deviceInfo, networkStatus } from '../../'
  import uiPlugin from '../../plugin'
  import Label from '../Label.svelte'
  import FontSizeSelector from './FontSizeSelector.svelte'
  import Computer from './icons/Computer.svelte'
  import Phone from './icons/Phone.svelte'
  import WiFi from './icons/WiFi.svelte'
  import LangSelector from './LangSelector.svelte'
  import ThemeSelector from './ThemeSelector.svelte'

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
        let last = loc.path[1] !== undefined ? localStorage.getItem(`${locationStorageKeyId}_${loc.path[1]}`) : null
        if (last === null) {
          last = localStorage.getItem(locationStorageKeyId)
        }
        let useDefault = true
        if (last !== null) {
          const storedLoc = JSON.parse(last)
          const key = storedLoc.path?.[0]
          if (Array.from(routes.values()).includes(key) || Array.from(routes.keys()).includes(key)) {
            useDefault = false
            navigate(storedLoc)
          }
        }
        if (useDefault) {
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
  let maintenanceTime = -1

  addEventListener(PlatformEvent, async (_event, _status: Status) => {
    if (_status.code === platform.status.MaintenanceWarning) {
      maintenanceTime = (_status.params as any).time
    } else {
      status = _status
    }
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

  let remove: any = null
  const sizes: Record<WidthType, boolean> = { xs: false, sm: false, md: false, lg: false, xl: false, xxl: false }
  const css: Record<WidthType, string> = { xs: '', sm: '', md: '', lg: '', xl: '', xxl: '' }
  deviceSizes.forEach((ds, i) => {
    if (i === 0) css[ds] = `(max-width: ${deviceWidths[i]}px)`
    else if (i === deviceSizes.length - 1) css[ds] = `(min-width: ${deviceWidths[i - 1]}.01px)`
    else css[ds] = `(min-width: ${deviceWidths[i - 1]}.01px) and (max-width: ${deviceWidths[i]}px)`
  })
  const getSize = (width: number): WidthType => {
    return deviceSizes[
      deviceWidths.findIndex((it) => (it === -1 ? deviceWidths[deviceWidths.length - 2] < width : it > width))
    ]
  }
  const updateDeviceSize = () => {
    if (remove !== null) remove()
    const size = getSize(docWidth)
    const mqString = css[size]
    const media = matchMedia(mqString)

    deviceWidths.forEach((_, i) => (sizes[deviceSizes[i]] = false))
    deviceWidths.forEach((dw, i) => {
      sizes[deviceSizes[i]] =
        dw === -1 ? deviceWidths[deviceWidths.length - 2] < docWidth : docWidth > dw || size === deviceSizes[i]
    })
    $deviceInfo.size = size
    $deviceInfo.sizes = sizes
    media.addEventListener('change', updateDeviceSize)
    remove = () => {
      media.removeEventListener('change', updateDeviceSize)
    }
  }
  updateDeviceSize()
</script>

<svelte:window bind:innerWidth={docWidth} bind:innerHeight={docHeight} />

<Theme>
  <div id="ui-root">
    <div class="antiStatusBar">
      <div class="flex-row-center h-full content-color">
        <div
          class="status-info"
          style:margin-left={(isPortrait && docWidth <= 480) || (!isPortrait && docHeight <= 480) ? '1.5rem' : '0'}
        >
          <div class="flex flex-row-center flex-center">
            {#if maintenanceTime > 0}
              <div class="flex-grow flex-center flex-row-center" class:maintenanceScheduled={maintenanceTime > 0}>
                <Label label={platform.status.MaintenanceWarning} params={{ time: maintenanceTime }} />
              </div>
            {/if}
            <StatusComponent {status} />
          </div>
        </div>
        <div class="flex-row-reverse">
          <div class="clock">
            <Clock />
          </div>
          <div class="flex-center widget">
            <LangSelector />
          </div>
          <div class="flex-center widget cursor-pointer">
            <ThemeSelector />
          </div>
          <div class="flex-center widget cursor-pointer">
            <FontSizeSelector />
          </div>
          <!-- svelte-ignore a11y-click-events-have-key-events -->
          <div
            class="flex-center widget"
            class:rotated={!isPortrait && isMobile}
            on:click={() => {
              alwaysMobile = !alwaysMobile
              document.documentElement.style.setProperty('--app-height', `${window.innerHeight}px`)
            }}
          >
            <svelte:component
              this={isMobile ? Phone : Computer}
              fill={alwaysMobile ? 'var(--theme-won-color)' : 'var(--content-color)'}
              size={'small'}
            />
          </div>
          <!-- svelte-ignore a11y-click-events-have-key-events -->
          <div
            class="flex-center widget cursor-pointer"
            on:click={(evt) => {
              getMetadata(uiPlugin.metadata.ShowNetwork)?.(evt)
            }}
          >
            <WiFi
              size={'small'}
              fill={$networkStatus === -1
                ? 'var(--theme-error-color)'
                : $networkStatus % 2 === 1
                ? 'var(--theme-warning-color)'
                : 'currentColor'}
            />
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

    .antiStatusBar {
      -webkit-app-region: drag;
      min-height: var(--status-bar-height);
      height: var(--status-bar-height);
      // min-width: 600px;
      font-size: 12px;
      line-height: 150%;
      background-color: var(--theme-statusbar-color);

      .maintenanceScheduled {
        padding: 0 0.5rem;
        width: fit-content;
        height: 1.25rem;
        max-width: 22rem;
        color: var(--tooltip-bg-color);
        background-color: var(--highlight-red);
        border-radius: 0.625rem;
      }

      .status-info {
        flex-grow: 1;
        text-align: center;
      }
      .clock {
        margin: 0 16px 0 24px;
        font-weight: 500;
        user-select: none;
      }
      .widget {
        -webkit-app-region: no-drag;
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
      .widget + .widget {
        margin-right: 12px;
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
