export interface NewTeamspace {
  title: string
  description?: string
  private?: boolean
  autoJoin?: boolean
}

export interface NewDocument {
  title: string
  space: string
  parentDocument?: string
  icon?: string
}

export interface Date {
  day: string
  month: string
  year: string
}
