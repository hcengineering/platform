import { getMetadata, type Resources } from '@hcengineering/platform'
import aiBot from '@hcengineering/ai-bot'
import { AccountRole, getCurrentAccount, hasAccountRole } from '@hcengineering/core'

import ControlExt from './components/ControlExt.svelte'
import EditMeetingData from './components/EditMeetingData.svelte'
import Main from './components/Main.svelte'
import MeetingData from './components/MeetingData.svelte'
import SelectScreenSourcePopup from './components/SelectScreenSourcePopup.svelte'
import Settings from './components/Settings.svelte'
import WorkbenchExtension from './components/WorkbenchExtension.svelte'
import LoveWidget from './components/LoveWidget.svelte'
import MeetingWidget from './components/widget/MeetingWidget.svelte'
import WidgetSwitcher from './components/widget/WidgetSwitcher.svelte'
import MeetingMinutesPresenter from './components/MeetingMinutesPresenter.svelte'
import MeetingMinutesSection from './components/MeetingMinutesSection.svelte'
import EditMeetingMinutes from './components/EditMeetingMinutes.svelte'
import EditRoom from './components/EditRoom.svelte'
import FloorAttributePresenter from './components/FloorAttributePresenter.svelte'
import FloorView from './components/FloorView.svelte'
import MeetingMinutesTable from './components/MeetingMinutesTable.svelte'
import PanelControlBar from './components/PanelControlBar.svelte'
import RoomPresenter from './components/RoomPresenter.svelte'
import MeetingMinutesDocEditor from './components/MeetingMinutesDocEditor.svelte'
import MeetingMinutesStatusPresenter from './components/MeetingMinutesStatusPresenter.svelte'

import {
  copyGuestLink,
  createMeeting,
  showRoomSettings,
  startTranscription,
  stopTranscription,
  toggleMic,
  toggleVideo,
  getMeetingMinutesTitle
} from './utils'

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
    MeetingWidget,
    WidgetSwitcher,
    MeetingMinutesPresenter,
    MeetingMinutesSection,
    EditMeetingMinutes,
    EditRoom,
    FloorAttributePresenter,
    FloorView,
    MeetingMinutesTable,
    PanelControlBar,
    RoomPresenter,
    MeetingMinutesDocEditor,
    MeetingMinutesStatusPresenter
  },
  function: {
    CreateMeeting: createMeeting,
    CanShowRoomSettings: () => {
      if (!hasAccountRole(getCurrentAccount(), AccountRole.User)) {
        return
      }
      // For now settings is available only when AI bot is enabled
      const url = getMetadata(aiBot.metadata.EndpointURL) ?? ''
      return url !== ''
    },
    CanCopyGuestLink: () => {
      return hasAccountRole(getCurrentAccount(), AccountRole.User)
    },
    MeetingMinutesTitleProvider: getMeetingMinutesTitle
  },
  actionImpl: {
    ToggleMic: toggleMic,
    ToggleVideo: toggleVideo,
    StartTranscribing: startTranscription,
    StopTranscribing: stopTranscription,
    ShowRoomSettings: showRoomSettings,
    CopyGuestLink: copyGuestLink
  }
})
