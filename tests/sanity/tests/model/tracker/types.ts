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
}
