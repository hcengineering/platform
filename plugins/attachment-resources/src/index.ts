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

import AddAttachment from './components/AddAttachment.svelte'
import AttachmentDroppable from './components/AttachmentDroppable.svelte'
import AttachmentsPresenter from './components/AttachmentsPresenter.svelte'
import AttachmentPresenter from './components/AttachmentPresenter.svelte'
import AttachmentDocList from './components/AttachmentDocList.svelte'
import AttachmentList from './components/AttachmentList.svelte'
import AttachmentRefInput from './components/AttachmentRefInput.svelte'
import TxAttachmentCreate from './components/activity/TxAttachmentCreate.svelte'
import Attachments from './components/Attachments.svelte'
import Photos from './components/Photos.svelte'
import { Resources } from '@anticrm/platform'
import { uploadFile, deleteFile } from './utils'

export { AddAttachment, AttachmentDroppable, Attachments, AttachmentsPresenter, AttachmentPresenter, AttachmentRefInput, AttachmentList, AttachmentDocList }

export default async (): Promise<Resources> => ({
  component: {
    AttachmentsPresenter,
    AttachmentPresenter,
    Attachments,
    Photos
  },
  activity: {
    TxAttachmentCreate
  },
  helper: {
    UploadFile: uploadFile,
    DeleteFile: deleteFile
  }
})
