import { getMetadata, type Resources } from '@hcengineering/platform'
import aiBot from '@hcengineering/ai-bot'
import { AccountRole, getCurrentAccount, hasAccountRole } from '@hcengineering/core'

import ControlExt from './components/meeting/ControlExt.svelte'
import EditMeetingData from './components/EditMeetingData.svelte'
import Main from './components/Main.svelte'
import MeetingData from './components/MeetingData.svelte'
import SelectScreenSourcePopup from './components/SelectScreenSourcePopup.svelte'
import Settings from './components/Settings.svelte'
import WorkbenchExtension from './components/WorkbenchExtension.svelte'
import LoveWidget from './components/LoveWidget.svelte'
import MeetingWidget from './components/meeting/widget/MeetingWidget.svelte'
import WidgetSwitcher from './components/meeting/widget/WidgetSwitcher.svelte'
import MeetingMinutesPresenter from './components/MeetingMinutesPresenter.svelte'
import MeetingMinutesSection from './components/MeetingMinutesSection.svelte'
import EditMeetingMinutes from './components/EditMeetingMinutes.svelte'
import EditRoom from './components/EditRoom.svelte'
import FloorAttributePresenter from './components/FloorAttributePresenter.svelte'
import FloorView from './components/FloorView.svelte'
import MeetingMinutesTable from './components/MeetingMinutesTable.svelte'
import RoomPresenter from './components/RoomPresenter.svelte'
import MeetingMinutesDocEditor from './components/MeetingMinutesDocEditor.svelte'
import MeetingMinutesStatusPresenter from './components/MeetingMinutesStatusPresenter.svelte'
import RoomLanguageEditor from './components/RoomLanguageEditor.svelte'
import MediaPopupItemExt from './components/MediaPopupItemExt.svelte'
import SharingStateIndicator from './components/SharingStateIndicator.svelte'
import MeetingScheduleData from './components/MeetingScheduleData.svelte'
import EditMeetingScheduleData from './components/EditMeetingScheduleData.svelte'

import {
  copyGuestLink,
  createMeeting,
  createMeetingSchedule,
  showRoomSettings,
  startTranscription,
  stopTranscription,
  getMeetingMinutesTitle,
  queryMeetingMinutes
} from './utils'
import { toggleMicState, toggleCamState } from '@hcengineering/media-resources'

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
    RoomPresenter,
    MeetingMinutesDocEditor,
    MeetingMinutesStatusPresenter,
    RoomLanguageEditor,
    MediaPopupItemExt,
    SharingStateIndicator,
    MeetingScheduleData,
    EditMeetingScheduleData
  },
  function: {
    CreateMeeting: createMeeting,
    CreateMeetingSchedule: createMeetingSchedule,
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
    ToggleMic: toggleMicState,
    ToggleVideo: toggleCamState,
    StartTranscribing: startTranscription,
    StopTranscribing: stopTranscription,
    ShowRoomSettings: showRoomSettings,
    CopyGuestLink: copyGuestLink
  },
  completion: {
    MeetingMinutesQuery: queryMeetingMinutes
  }
})
