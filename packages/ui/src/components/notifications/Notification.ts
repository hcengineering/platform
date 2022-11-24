import { NotificationPosition } from './NotificationPosition'
import { NotificationSeverity } from './NotificationSeverity'
import { AnyComponent, AnySvelteComponent } from '../../types'

export interface Notification {
  id: string
  title: string
  component: AnyComponent | AnySvelteComponent
  subTitle?: string
  subTitlePostfix?: string
  position: NotificationPosition
  severity?: NotificationSeverity
  params?: { [key: string]: any }
  closeTimeout?: number
}
