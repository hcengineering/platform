import { NotificationPosition } from './NotificationPosition'
import { NotificationSeverity } from './NotificationSeverity'
import { AnyComponent } from '../../types'

export interface Notification {
  id: string
  title: string
  component: AnyComponent
  subTitle?: string
  subTitlePostfix?: string
  position: NotificationPosition
  severity?: NotificationSeverity
  params?: { [key: string]: any }
  closeTimeout?: number
}
