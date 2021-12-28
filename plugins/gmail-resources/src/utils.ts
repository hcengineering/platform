export function getTime (time: number): string {
  let options: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: 'numeric' }
  if (!isCurrentYear(time)) {
    options = {
      year: '2-digit',
      month: 'numeric',
      day: 'numeric',
      ...options
    }
  } else if (!isToday(time)) {
    options = {
      month: 'numeric',
      day: 'numeric',
      ...options
    }
  }

  return new Date(time).toLocaleString('default', options)
}

export function isToday (time: number): boolean {
  const current = new Date()
  const target = new Date(time)
  return (
    current.getDate() === target.getDate() &&
    current.getMonth() === target.getMonth() &&
    current.getFullYear() === target.getFullYear()
  )
}

export function isCurrentYear (time: number): boolean {
  const current = new Date()
  const target = new Date(time)
  return current.getFullYear() === target.getFullYear()
}
