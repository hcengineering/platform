import { type Resources } from '@hcengineering/platform'
import ControlExt from './components/ControlExt.svelte'
import Main from './components/Main.svelte'
import Settings from './components/Settings.svelte'
import WorkbenchExtension from './components/WorkbenchExtension.svelte'
import { toggleMic, toggleVideo } from './utils'

export default async (): Promise<Resources> => ({
  component: {
    Main,
    ControlExt,
    Settings,
    WorkbenchExtension
  },
  actionImpl: {
    ToggleMic: toggleMic,
    ToggleVideo: toggleVideo
  }
})
