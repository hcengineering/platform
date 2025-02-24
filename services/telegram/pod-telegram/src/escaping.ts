export const escape = (str: string): string => {
  try {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  } catch (ee: any) {
    console.error(ee)
  }
  return str
}

export const unescape = (str: string): string => str.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
