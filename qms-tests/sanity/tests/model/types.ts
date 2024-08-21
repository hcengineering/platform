export interface NewDocument {
  location?: Location
  template: string
  title: string
  description: string
  reason?: string
  reviewers?: Array<string>
  approvers?: Array<string>
}

export interface Location {
  space?: string
  parent?: string
}

export interface UserSignUp {
  firstName: string
  lastName: string
  email: string
  password: string
}

export enum DocumentStatus {
  DELETED = 'Deleted',
  DRAFT = 'Draft',
  IN_REVIEW = 'In Review',
  IN_APPROVAL = 'In Approval',
  REVIEWED = 'Reviewed',
  REJECTED = 'Rejected',
  APPROVED = 'Approved',
  EFFECTIVE = 'Effective',
  ARCHIVED = 'Archived'
}

export interface DocumentDetails {
  type: string
  category: string
  version: string
  status: string
  owner: string
  author: string
  id?: string
}

export enum DocumentRights {
  VIEWING = 'Viewing',
  EDITING = 'Editing',
  COMPARING = 'Comparing'
}

export interface NewTemplate {
  location?: Location
  title: string
  description: string
  code?: string
  category?: string
  reason?: string
  reviewers?: Array<string>
  approvers?: Array<string>
}

export interface NewCategory extends UpdateCategory {
  title: string
  code: string
}

export interface UpdateCategory {
  description: string
  attachFileName?: string
}
