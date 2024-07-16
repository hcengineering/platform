export const myDescription = 'With this bot you can get all notifications and reply to them without leaving Telegram.'
export const myShortDescription =
  'With this bot you can get all notifications and reply to them without leaving Telegram'

export const welcomeMessage =
  'Welcome! I am a bot that will help you to get all notifications and reply to them without leaving Telegram.'
export const stopMessage =
  'You will no longer receive notifications about Huly events. If you want to turn them back on, just send /start.'

export const myCommands = [
  {
    command: 'start',
    description: 'Authorize the bot'
  },
  {
    command: 'help',
    description: 'Show commands details'
  },
  {
    command: 'stop',
    description: 'Turn notifications off'
  }
]

export const commandsHelp = myCommands.map(({ command, description }) => `/${command} - ${description}`).join('\n')
