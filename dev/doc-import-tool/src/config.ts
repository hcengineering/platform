import { Employee } from '@hcengineering/contact'
import { Ref, WorkspaceDataId, WorkspaceUuid } from '@hcengineering/core'
import { DocumentSpace } from '@hcengineering/controlled-documents'
import { StorageAdapter } from '@hcengineering/server-core'

import { HtmlConversionBackend } from './convert/convert'

export interface Config {
  doc: string
  token: string
  collaborator?: string
  collaboratorURL: string
  uploadURL: string
  workspaceId: WorkspaceUuid
  workspaceDataId?: WorkspaceDataId
  owner: Ref<Employee>
  backend: HtmlConversionBackend
  space: Ref<DocumentSpace>
  storageAdapter: StorageAdapter
  specFile?: string
}
