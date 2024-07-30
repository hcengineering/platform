import { Employee } from '@hcengineering/contact'
import { Ref, WorkspaceId } from '@hcengineering/core'
import { DocumentSpace } from '@hcengineering/controlled-documents'

import { HtmlConversionBackend } from './convert/convert'

export interface Config {
  doc: string
  token: string
  collaboratorApiURL: string
  uploadURL: string
  workspaceId: WorkspaceId
  owner: Ref<Employee>
  backend: HtmlConversionBackend
  space: Ref<DocumentSpace>
  specFile?: string
}
