import { Context, session, Telegraf } from 'telegraf'

import config from './config'
import { commandsHelp, myCommands, myDescription, myShortDescription, stopMessage, welcomeMessage } from './consts'

async function onStart (ctx: Context): Promise<void> {
  await ctx.reply(welcomeMessage + '\n\n' + commandsHelp)
}

async function onHelp (ctx: Context): Promise<void> {
  await ctx.reply(commandsHelp)
}

async function onStop (ctx: Context): Promise<void> {
  await ctx.reply(stopMessage)
}

export async function setUpBot (): Promise<Telegraf> {
  const bot = new Telegraf(config.BotToken)

  bot.use(session())

  await bot.telegram.setMyCommands(myCommands)

  bot.start(onStart)
  bot.help(onHelp)

  bot.command('stop', onStop)

  await bot.telegram.setMyDescription(myDescription)
  await bot.telegram.setMyShortDescription(myShortDescription)

  void bot.launch()

  return bot
}
