import { type NotificationPosition } from './NotificationPosition'
import { type NotificationSeverity } from './NotificationSeverity'
import { type AnyComponent, type AnySvelteComponent } from '../../types'

export interface Notification {
  id: string
  title: string
  component: AnyComponent | AnySvelteComponent
  subTitle?: string
  subTitlePostfix?: string
  position: NotificationPosition
  severity?: NotificationSeverity
  params?: Record<string, any>
  closeTimeout?: number
}
