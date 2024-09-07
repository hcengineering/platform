//
// Copyright © 2024 Hardcore Engineering Inc.
//

import { type Builder } from '@hcengineering/model'
import core from '@hcengineering/core'
import documents from '@hcengineering/controlled-documents'

export function definePermissions (builder: Builder): void {
  builder.createDoc(
    core.class.Permission,
    core.space.Model,
    {
      label: documents.string.ReviewDocumentPermission,
      description: documents.string.ReviewDocumentDescription
    },
    documents.permission.ReviewDocument
  )

  builder.createDoc(
    core.class.Permission,
    core.space.Model,
    {
      label: documents.string.ApproveDocumentPermission,
      description: documents.string.ApproveDocumentDescription
    },
    documents.permission.ApproveDocument
  )

  builder.createDoc(
    core.class.Permission,
    core.space.Model,
    {
      label: documents.string.ArchiveDocumentPermission,
      description: documents.string.ArchiveDocumentDescription
    },
    documents.permission.ArchiveDocument
  )

  builder.createDoc(
    core.class.Permission,
    core.space.Model,
    {
      label: documents.string.CoAuthorDocumentPermission,
      description: documents.string.CoAuthorDocumentDescription
    },
    documents.permission.CoAuthorDocument
  )

  builder.createDoc(
    core.class.Permission,
    core.space.Model,
    {
      label: documents.string.CreateDocumentPermission,
      description: documents.string.CreateDocumentDescription
    },
    documents.permission.CreateDocument
  )

  builder.createDoc(
    core.class.Permission,
    core.space.Model,
    {
      label: documents.string.UpdateDocumentOwnerPermission,
      description: documents.string.UpdateDocumentOwnerDescription
    },
    documents.permission.UpdateDocumentOwner
  )

  builder.createDoc(
    core.class.Permission,
    core.space.Model,
    {
      label: documents.string.CreateDocumentCategoryPermission,
      description: documents.string.CreateDocumentCategoryDescription
    },
    documents.permission.CreateDocumentCategory
  )

  builder.createDoc(
    core.class.Permission,
    core.space.Model,
    {
      label: documents.string.UpdateDocumentCategoryPermission,
      description: documents.string.UpdateDocumentCategoryDescription
    },
    documents.permission.UpdateDocumentCategory
  )

  builder.createDoc(
    core.class.Permission,
    core.space.Model,
    {
      label: documents.string.DeleteDocumentCategoryPermission,
      description: documents.string.DeleteDocumentCategoryDescription
    },
    documents.permission.DeleteDocumentCategory
  )
}
