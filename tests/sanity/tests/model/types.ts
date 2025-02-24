export interface DateDivided {
  day: string
  month: string
  year: string
}

export type SpaceTypes =
  | 'Documents'
  | 'Drive'
  | 'Trainings'
  | 'Controlled Documents'
  | 'Products'
  | 'Recruiting'
  | 'Leads'
  | 'Tracker'
  | 'Boards'
  | 'Github'

export enum TaskTypes {
  Task = 'Task',
  Subtask = 'Sub-task',
  TaskAndSubtask = 'Task & Sub-task'
}

export enum LinkedChannelTypes {
  Issue = 'Issue',
  Vacancy = 'Vacancy',
  Application = 'Application'
}
