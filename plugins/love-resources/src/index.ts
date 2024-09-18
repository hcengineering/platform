import { type Resources } from '@hcengineering/platform'
import ControlExt from './components/ControlExt.svelte'
import EditMeetingData from './components/EditMeetingData.svelte'
import Main from './components/Main.svelte'
import MeetingData from './components/MeetingData.svelte'
import SelectScreenSourcePopup from './components/SelectScreenSourcePopup.svelte'
import Settings from './components/Settings.svelte'
import WorkbenchExtension from './components/WorkbenchExtension.svelte'
import LoveWidget from './components/LoveWidget.svelte'
import VideoWidget from './components/VideoWidget.svelte'
import { createMeeting, toggleMic, toggleVideo } from './utils'

export { setCustomCreateScreenTracks } from './utils'

export default async (): Promise<Resources> => ({
  component: {
    Main,
    ControlExt,
    Settings,
    WorkbenchExtension,
    SelectScreenSourcePopup,
    MeetingData,
    EditMeetingData,
    LoveWidget,
    VideoWidget
  },
  function: {
    CreateMeeting: createMeeting
  },
  actionImpl: {
    ToggleMic: toggleMic,
    ToggleVideo: toggleVideo
  }
})
