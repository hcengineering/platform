import { Organization } from '@anticrm/contact'
import { Domain, IndexKind, Ref } from '@anticrm/core'
import { Collection, Index, Model, Prop, TypeMarkup, TypeRef, TypeString, UX } from '@anticrm/model'
import attachment from '@anticrm/model-attachment'
import calendar, { TEvent } from '@anticrm/model-calendar'
import chunter from '@anticrm/model-chunter'
import contact from '@anticrm/model-contact'
import core, { TAttachedDoc, TSpace } from '@anticrm/model-core'
import task from '@anticrm/model-task'
import { Candidate, Opinion, Review, ReviewCategory } from '@anticrm/recruit'
import recruit from './plugin'

@Model(recruit.class.ReviewCategory, core.class.Space)
@UX(recruit.string.ReviewCategory, recruit.icon.Review)
export class TReviewCategory extends TSpace implements ReviewCategory {
  @Prop(TypeString(), recruit.string.FullDescription)
  fullDescription?: string
}

@Model(recruit.class.Review, calendar.class.Event)
@UX(recruit.string.Review, recruit.icon.Review, recruit.string.ReviewShortLabel, 'number')
export class TReview extends TEvent implements Review {
  // We need to declare, to provide property with label
  @Prop(TypeRef(recruit.mixin.Candidate), recruit.string.Candidate)
  declare attachedTo: Ref<Candidate>

  @Prop(TypeString(), recruit.string.Review)
  number!: number

  @Prop(TypeString(), recruit.string.Verdict)
  @Index(IndexKind.FullText)
  verdict!: string

  @Prop(TypeRef(contact.class.Organization), recruit.string.Company, contact.icon.Company)
  company?: Ref<Organization>

  @Prop(Collection(recruit.class.Opinion), recruit.string.Opinions)
  opinions?: number
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
