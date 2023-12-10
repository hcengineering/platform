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

// export interface TargetDate {
//   targetDate: boolean
//   targetDateDay: string
//   targetDateMonth: string
//   targetDateYear: string
// }

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
