export interface NewIssue extends Issue {
  title: string
  description: string
}

export interface Issue {
  status?: string
  priority?: string
  assignee?: string
  createLabel?: boolean
  labels?: string
  component?: string
  estimation?: string
  milestone?: string
  duedate?: string
  filePath?: string
  parentIssue?: string
}

export interface NewProject {
  title: string
  identifier: string
  description: string
  private: boolean
  defaultAssigneeForIssues: string
  defaultIssueStatus: string
  iconNumber?: number
  type?: string
}
