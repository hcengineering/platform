export interface NewIssue {
  title: string
  description: string
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
