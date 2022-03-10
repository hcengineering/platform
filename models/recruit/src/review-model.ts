import { Employee } from '@anticrm/contact'
import { Domain, IndexKind, Ref, Timestamp } from '@anticrm/core'
import { Collection, Index, Model, Prop, TypeDate, TypeMarkup, TypeRef, TypeString, UX } from '@anticrm/model'
import attachment from '@anticrm/model-attachment'
import chunter from '@anticrm/model-chunter'
import contact from '@anticrm/model-contact'
import core, { TAttachedDoc } from '@anticrm/model-core'
import task, { TSpaceWithStates, TTask } from '@anticrm/model-task'
import { Candidate, Opinion, Review, ReviewCategory } from '@anticrm/recruit'
import recruit from './plugin'

@Model(recruit.class.ReviewCategory, task.class.SpaceWithStates)
@UX(recruit.string.ReviewCategory, recruit.icon.Review)
export class TReviewCategory extends TSpaceWithStates implements ReviewCategory {
  @Prop(TypeString(), recruit.string.FullDescription)
  fullDescription?: string
}

@Model(recruit.class.Review, task.class.Task)
@UX(recruit.string.Review, recruit.icon.Review, recruit.string.ReviewShortLabel, 'number')
export class TReview extends TTask implements Review {
  // We need to declare, to provide property with label
  @Prop(TypeRef(recruit.class.Applicant), recruit.string.Candidate)
  declare attachedTo: Ref<Candidate>

  @Prop(TypeRef(contact.class.Employee), recruit.string.AssignedRecruiter)
  declare assignee: Ref<Employee> | null

  @Prop(TypeMarkup(), recruit.string.Description)
  @Index(IndexKind.FullText)
  description!: string

  @Index(IndexKind.FullText)
  @Prop(TypeMarkup(), recruit.string.Verdict)
  verdict!: string

  @Index(IndexKind.FullText)
  @Prop(TypeString(), recruit.string.Location, recruit.icon.Location)
  location?: string

  @Index(IndexKind.FullText)
  @Prop(TypeString(), recruit.string.Company, contact.icon.Company)
  company?: string

  @Prop(TypeDate(), recruit.string.StartDate)
  startDate!: Timestamp | null

  @Prop(TypeDate(), recruit.string.DueDate)
  dueDate!: Timestamp | null

  @Prop(Collection(recruit.class.Opinion), recruit.string.Opinions)
  opinions?: number

  @Prop(Collection(attachment.class.Attachment), attachment.string.Attachments)
  attachments?: number

  @Prop(Collection(chunter.class.Comment), chunter.string.Comments)
  comments?: number
}

@Model(recruit.class.Opinion, core.class.AttachedDoc, 'recruit' as Domain)
@UX(recruit.string.Opinion, recruit.icon.Opinion, recruit.string.OpinionShortLabel)
export class TOpinion extends TAttachedDoc implements Opinion {
  @Prop(TypeString(), task.string.TaskNumber)
  number!: number

  // We need to declare, to provide property with label
  @Prop(TypeRef(recruit.class.Review), recruit.string.Review)
  declare attachedTo: Ref<Review>

  @Prop(Collection(attachment.class.Attachment), attachment.string.Attachments)
  attachments?: number

  @Prop(Collection(chunter.class.Comment), chunter.string.Comments)
  comments?: number

  @Prop(TypeMarkup(), recruit.string.Description)
  description!: string

  @Prop(TypeString(), recruit.string.OpinionValue)
  value!: string
}
