const FLAG_OPEN_IN_DESKTOP = 'flagOpenInDesktopApp'
const TIMESTAMP_OPEN_IN_DESKTOP = 'timeOpenInDesktopApp'
const TIMEOUT_OPEN_IN_DESKTOP = 24 * 60 * 60 * 1000

export function tryOpenInDesktopApp(protocol: string) {
  if (!window.location.origin) {
    return
  }

  // Once for a new TAB
  if (window.sessionStorage && (window.sessionStorage.getItem(FLAG_OPEN_IN_DESKTOP) === 'true'
    || window.localStorage.getItem(FLAG_OPEN_IN_DESKTOP) === 'true')) {
    return
  }
  window.sessionStorage.setItem(FLAG_OPEN_IN_DESKTOP, 'true')

  // Once in timeout
  if (window.localStorage && window.localStorage.getItem(TIMESTAMP_OPEN_IN_DESKTOP)) {
    const timeStr = window.localStorage.getItem(TIMESTAMP_OPEN_IN_DESKTOP)
    const time = Number(timeStr)
    const now = Date.now()
    if ((now - time) < TIMEOUT_OPEN_IN_DESKTOP) {
      return
    }
  }
  window.localStorage.setItem(TIMESTAMP_OPEN_IN_DESKTOP, Date.now().toString())

  // Filter only URLs inside a workbench
  const link = window.location.toString()

  if (link.indexOf('/workbench/') === -1) {
    return
  }

  const deepLink = link.replace('http://', protocol)
    .replace('https://', protocol)

  const iframe = document.createElement('iframe');
  iframe.style.display = 'none';
  iframe.src = deepLink;

  document.body.appendChild(iframe);
}
