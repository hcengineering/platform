export interface NewApplication {
  talentsName?: string
  vacancy: string
  recruiterName: string
}

export interface TalentName {
  firstName: string
  lastName: string
}

export interface MergeContacts {
  finalContactName: string
  name: string
  mergeLocation: boolean
  location: string
  mergeTitle: boolean
  title: string
  mergeSource: boolean
  source: string
}

export interface NewVacancy {
  title: string
  description: string
  location?: string
}
