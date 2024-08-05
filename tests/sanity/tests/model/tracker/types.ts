export interface NewIssue extends Issue {
  title: string
  description: string
  projectName?: string
}

export interface Issue {
  title?: string
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
  relatedIssue?: string
  blockedBy?: string
  blocks?: string
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

export interface NewMilestone {
  name: string
  description?: string
  status?: string
  targetDate?: {
    day: string
    month: string
    year: string
  }
  targetDateInDays?: string
}

export interface NewComponent {
  name: string
  description?: string
  lead?: string
}
