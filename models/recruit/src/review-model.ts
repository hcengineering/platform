import { Organization } from '@hcengineering/contact'
import { Domain, IndexKind, Ref } from '@hcengineering/core'
import { Collection, Index, Model, Prop, TypeMarkup, TypeRef, TypeString, UX } from '@hcengineering/model'
import attachment from '@hcengineering/model-attachment'
import calendar, { TEvent } from '@hcengineering/model-calendar'
import chunter from '@hcengineering/model-chunter'
import contact from '@hcengineering/model-contact'
import core, { TAttachedDoc } from '@hcengineering/model-core'
import task from '@hcengineering/model-task'
import { Applicant, Candidate, Opinion, Review } from '@hcengineering/recruit'
import recruit from './plugin'

@Model(recruit.class.Review, calendar.class.Event)
@UX(recruit.string.Review, recruit.icon.Review, 'RVE', 'number')
export class TReview extends TEvent implements Review {
  // We need to declare, to provide property with label
  @Prop(TypeRef(recruit.mixin.Candidate), recruit.string.Talent)
  declare attachedTo: Ref<Candidate>

  @Prop(TypeString(), recruit.string.Review)
    number!: number

  @Prop(TypeString(), recruit.string.Verdict)
  @Index(IndexKind.FullText)
    verdict!: string

  @Prop(TypeRef(recruit.class.Applicant), recruit.string.Application, { icon: recruit.icon.Application })
    application?: Ref<Applicant>

  @Prop(TypeRef(contact.class.Organization), recruit.string.Company, { icon: contact.icon.Company })
    company?: Ref<Organization>

  @Prop(Collection(recruit.class.Opinion), recruit.string.Opinions)
    opinions?: number
}

@Model(recruit.class.Opinion, core.class.AttachedDoc, 'recruit' as Domain)
@UX(recruit.string.Opinion, recruit.icon.Opinion, 'OPE')
export class TOpinion extends TAttachedDoc implements Opinion {
  @Prop(TypeString(), task.string.TaskNumber)
    number!: number

  // We need to declare, to provide property with label
  @Prop(TypeRef(recruit.class.Review), recruit.string.Review)
  declare attachedTo: Ref<Review>

  @Prop(Collection(attachment.class.Attachment), attachment.string.Attachments, { shortLabel: attachment.string.Files })
    attachments?: number

  @Prop(Collection(chunter.class.Comment), chunter.string.Comments)
    comments?: number

  @Prop(TypeMarkup(), recruit.string.Description)
    description!: string

  @Prop(TypeString(), recruit.string.OpinionValue)
    value!: string
}
