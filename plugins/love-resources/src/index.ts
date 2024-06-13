import { type Resources } from '@hcengineering/platform'
import ControlExt from './components/ControlExt.svelte'
import Main from './components/Main.svelte'
import Settings from './components/Settings.svelte'
import WorkbenchExtension from './components/WorkbenchExtension.svelte'
import SelectScreenSourcePopup from './components/SelectScreenSourcePopup.svelte'
import { toggleMic, toggleVideo } from './utils'

export { setCustomCreateScreenTracks } from './utils'

export default async (): Promise<Resources> => ({
  component: {
    Main,
    ControlExt,
    Settings,
    WorkbenchExtension,
    SelectScreenSourcePopup
  },
  actionImpl: {
    ToggleMic: toggleMic,
    ToggleVideo: toggleVideo
  }
})
