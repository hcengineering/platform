//
// Copyright © 2020 Anticrm Platform Contributors.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
//

import activity, { type ActivityMessage, type DocUpdateMessage } from '@hcengineering/activity'
import attachment, { type Attachment } from '@hcengineering/attachment'
import core, { SortingOrder, type Markup, type ObjQueryType, type SortingQuery } from '@hcengineering/core'
import { type IntlString, type Resources } from '@hcengineering/platform'
import { PDFViewer, deleteFile, getClient, uploadFile } from '@hcengineering/presentation'

import AccordionEditor from './components/AccordionEditor.svelte'
import AddAttachment from './components/AddAttachment.svelte'
import AttachmentDocList from './components/AttachmentDocList.svelte'
import AttachmentDroppable from './components/AttachmentDroppable.svelte'
import AttachmentGalleryPresenter from './components/AttachmentGalleryPresenter.svelte'
import AttachmentList from './components/AttachmentList.svelte'
import AttachmentGroup from './components/AttachmentGroup.svelte'
import AttachmentPresenter from './components/AttachmentPresenter.svelte'
import AttachmentPreview from './components/AttachmentPreview.svelte'
import AttachmentRefInput from './components/AttachmentRefInput.svelte'
import AttachmentStyleBoxCollabEditor from './components/AttachmentStyleBoxCollabEditor.svelte'
import AttachmentStyleBoxEditor from './components/AttachmentStyleBoxEditor.svelte'
import AttachmentStyledBox from './components/AttachmentStyledBox.svelte'
import Attachments from './components/Attachments.svelte'
import AttachmentsPresenter from './components/AttachmentsPresenter.svelte'
import AttachmentsTooltip from './components/AttachmentsTooltip.svelte'
import FileBrowser from './components/FileBrowser.svelte'
import Photos from './components/Photos.svelte'
import AttachmentsUpdatedMessage from './components/activity/AttachmentsUpdatedMessage.svelte'
import IconAttachment from './components/icons/Attachment.svelte'
import FileDownload from './components/icons/FileDownload.svelte'
import IconUploadDuo from './components/icons/UploadDuo.svelte'
import PreviewWidget from './components/PreviewWidget.svelte'
import PreviewPopupActions from './components/PreviewPopupActions.svelte'
import DrawingPresenter from './components/DrawingPresenter.svelte'

export * from './types'

export {
  AccordionEditor,
  AddAttachment,
  AttachmentDocList,
  AttachmentDroppable,
  AttachmentGalleryPresenter,
  AttachmentList,
  AttachmentGroup,
  AttachmentPresenter,
  AttachmentPreview,
  AttachmentRefInput,
  AttachmentStyleBoxCollabEditor,
  AttachmentStyleBoxEditor,
  AttachmentStyledBox,
  Attachments,
  AttachmentsPresenter,
  AttachmentsTooltip,
  FileBrowser,
  FileDownload,
  IconAttachment,
  IconUploadDuo
}

export enum FileBrowserSortMode {
  NewestFile,
  OldestFile,
  AscendingAlphabetical,
  DescendingAlphabetical,
  SmallestSize,
  BiggestSize
}

export const sortModeToOptionObject = (sortMode: FileBrowserSortMode): SortingQuery<Attachment> => {
  switch (sortMode) {
    case FileBrowserSortMode.NewestFile:
      return { modifiedOn: SortingOrder.Descending }
    case FileBrowserSortMode.OldestFile:
      return { modifiedOn: SortingOrder.Ascending }
    case FileBrowserSortMode.AscendingAlphabetical:
      return { name: SortingOrder.Ascending }
    case FileBrowserSortMode.DescendingAlphabetical:
      return { name: SortingOrder.Descending }
    case FileBrowserSortMode.SmallestSize:
      return { size: SortingOrder.Ascending }
    case FileBrowserSortMode.BiggestSize:
      return { size: SortingOrder.Descending }
  }
}

const msInDay = 24 * 60 * 60 * 1000
const getBeginningOfDate = (customDate?: Date): number => {
  if (customDate == null) {
    customDate = new Date()
  }
  customDate.setUTCHours(0, 0, 0, 0)
  return customDate.getTime()
}

interface Filter {
  id: string
  label: IntlString
}

interface DateFilter extends Filter {
  getDate: () => ObjQueryType<number> | undefined
}

interface TypeFilter extends Filter {
  getType: () => ObjQueryType<string> | undefined
}

export const dateFileBrowserFilters: DateFilter[] = [
  {
    id: 'dateAny',
    label: attachment.string.FileBrowserDateFilterAny,
    getDate: () => {
      return undefined
    }
  },
  {
    id: 'dateToday',
    label: attachment.string.FileBrowserDateFilterToday,
    getDate: () => {
      return { $gte: getBeginningOfDate() }
    }
  },
  {
    id: 'dateYesterday',
    label: attachment.string.FileBrowserDateFilterYesterday,
    getDate: () => {
      return { $gte: getBeginningOfDate() - msInDay, $lt: getBeginningOfDate() }
    }
  },
  {
    id: 'date7Days',
    label: attachment.string.FileBrowserDateFilter7Days,
    getDate: () => {
      return { $gte: getBeginningOfDate() - msInDay * 6 }
    }
  },
  {
    id: 'date30Days',
    label: attachment.string.FileBrowserDateFilter30Days,
    getDate: () => {
      return { $gte: getBeginningOfDate() - msInDay * 29 }
    }
  },
  {
    id: 'date3Months',
    label: attachment.string.FileBrowserDateFilter3Months,
    getDate: () => {
      const now = new Date()
      now.setMonth(now.getMonth() - 3)
      return { $gte: getBeginningOfDate(now) }
    }
  },
  {
    id: 'date12Months',
    label: attachment.string.FileBrowserDateFilter12Months,
    getDate: () => {
      const now = new Date()
      now.setMonth(now.getMonth() - 12)
      return { $gte: getBeginningOfDate(now) }
    }
  }
]

export const fileTypeFileBrowserFilters: TypeFilter[] = [
  {
    id: 'typeAny',
    label: attachment.string.FileBrowserTypeFilterAny,
    getType: () => {
      return undefined
    }
  },
  {
    id: 'typeImage',
    label: attachment.string.FileBrowserTypeFilterImages,
    getType: () => {
      return { $like: '%image/%' }
    }
  },
  {
    id: 'typeAudio',
    label: attachment.string.FileBrowserTypeFilterAudio,
    getType: () => {
      return { $like: '%audio/%' }
    }
  },
  {
    id: 'typeVideo',
    label: attachment.string.FileBrowserTypeFilterVideos,
    getType: () => {
      return { $like: '%video/%' }
    }
  },
  {
    id: 'typePDF',
    label: attachment.string.FileBrowserTypeFilterPDFs,
    getType: () => {
      return 'application/pdf'
    }
  }
]

export async function AddAttachmentToSaved (attach: Attachment): Promise<void> {
  const client = getClient()

  await client.createDoc(attachment.class.SavedAttachments, core.space.Workspace, {
    attachedTo: attach._id
  })
}

export async function DeleteAttachmentFromSaved (attach: Attachment): Promise<void> {
  const client = getClient()

  const current = await client.findOne(attachment.class.SavedAttachments, { attachedTo: attach._id })
  if (current !== undefined) {
    await client.remove(current)
  }
}

export async function DeleteAttachment (attach: Attachment): Promise<void> {
  const client = getClient()

  await client.removeCollection(
    attach._class,
    attach.space,
    attach._id,
    attach.attachedTo,
    attach.attachedToClass,
    'attachments'
  )
}

export function attachmentsFilter (message: ActivityMessage): boolean {
  if (message._class === activity.class.DocUpdateMessage) {
    return (message as DocUpdateMessage).objectClass === attachment.class.Attachment
  }

  return false
}

export default async (): Promise<Resources> => ({
  filter: {
    AttachmentsFilter: attachmentsFilter
  },
  component: {
    AttachmentsPresenter,
    AttachmentPresenter,
    AttachmentGalleryPresenter,
    Attachments,
    DrawingPresenter,
    FileBrowser,
    Photos,
    PDFViewer,
    PreviewWidget,
    PreviewPopupActions
  },
  activity: {
    AttachmentsUpdatedMessage
  },
  helper: {
    UploadFile: uploadFile,
    DeleteFile: deleteFile
  },
  actionImpl: {
    AddAttachmentToSaved,
    DeleteAttachmentFromSaved,
    DeleteAttachment
  }
})

export interface AccordionItem {
  id: string
  label: IntlString
  tooltip: IntlString
  content: Markup
  state: 'opened' | 'closed'
  placeholder?: IntlString
}
