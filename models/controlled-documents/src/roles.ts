//
// Copyright © 2024 Hardcore Engineering Inc.
//

import core from '@hcengineering/core'

import documents from './plugin'

export const roles = [
  {
    _id: documents.role.QualifiedUser,
    name: 'Qualified User',
    permissions: [
      documents.permission.ReviewDocument,
      documents.permission.ApproveDocument,
      documents.permission.CoAuthorDocument
    ]
  },
  {
    _id: documents.role.Manager,
    name: 'Manager',
    permissions: [
      documents.permission.CreateDocument,
      documents.permission.ReviewDocument,
      documents.permission.ApproveDocument,
      documents.permission.CoAuthorDocument,
      documents.permission.CreateDocumentCategory,
      documents.permission.UpdateDocumentCategory,
      documents.permission.DeleteDocumentCategory,
      core.permission.UpdateSpace
    ]
  },
  {
    _id: documents.role.QARA,
    name: 'QARA',
    permissions: [
      documents.permission.CreateDocument,
      documents.permission.ReviewDocument,
      documents.permission.ApproveDocument,
      documents.permission.CoAuthorDocument,
      documents.permission.ArchiveDocument,
      documents.permission.UpdateDocumentOwner,
      documents.permission.CreateDocumentCategory,
      documents.permission.UpdateDocumentCategory,
      documents.permission.DeleteDocumentCategory,
      core.permission.UpdateSpace
    ]
  }
]
