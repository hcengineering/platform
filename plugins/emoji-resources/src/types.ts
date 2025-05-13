import type { Asset, IntlString } from '@hcengineering/platform'
import { type EmojiWithGroup } from '@hcengineering/emoji'
import emojiPlugin from '@hcengineering/emoji'

export interface EmojiCategory {
  id: string
  label: IntlString
  icon: Asset
  categories?: string[] | string
  emojisString?: string[]
  emojis?: EmojiWithGroup[]
}

export const emojiCategories: EmojiCategory[] = [
  { id: 'frequently-used', label: emojiPlugin.string.FrequentlyUsed, icon: emojiPlugin.icon.FrequentlyUsed },
  {
    id: 'getting-work-done',
    label: emojiPlugin.string.GettingWorkDone,
    icon: emojiPlugin.icon.GettingWorkDone,
    emojisString: [
      '2705',
      '1F440',
      '1F64C',
      '1F64F',
      '2795',
      '2796',
      '1F44F',
      '1F4A1',
      '1F3AF',
      '1F44B',
      '1F44D',
      '1F389',
      '0031-FE0F-20E3',
      '0032-FE0F-20E3',
      '0033-FE0F-20E3',
      '1F4E3',
      '26AA',
      '1F535',
      '1F534',
      '1F3CE'
    ]
  },
  { id: 'custom', label: emojiPlugin.string.CustomEmojis, icon: emojiPlugin.icon.Custom, categories: 'custom' },
  {
    id: 'smileys-people',
    label: emojiPlugin.string.SmileysAndPeople,
    icon: emojiPlugin.icon.SmileysAndPeople,
    categories: ['smileys-emotion', 'people-body']
  },
  {
    id: 'animals-nature',
    label: emojiPlugin.string.AnimalsAndNature,
    icon: emojiPlugin.icon.AnimalsAndNature,
    categories: 'animals-nature'
  },
  {
    id: 'food-drink',
    label: emojiPlugin.string.FoodAndDrink,
    icon: emojiPlugin.icon.FoodAndDrink,
    categories: 'food-drink'
  },
  {
    id: 'travel-places',
    label: emojiPlugin.string.TravelAndPlaces,
    icon: emojiPlugin.icon.TravelAndPlaces,
    categories: 'travel-places'
  },
  {
    id: 'activities',
    label: emojiPlugin.string.Activities,
    icon: emojiPlugin.icon.Activities,
    categories: 'activities'
  },
  { id: 'objects', label: emojiPlugin.string.Objects, icon: emojiPlugin.icon.Objects, categories: 'objects' },
  { id: 'symbols', label: emojiPlugin.string.Symbols, icon: emojiPlugin.icon.Symbols, categories: 'symbols' },
  { id: 'flags', label: emojiPlugin.string.Flags, icon: emojiPlugin.icon.Flags, categories: 'flags' }
]

export const skinTones: Map<number, IntlString> = new Map<number, IntlString>(
  [
    emojiPlugin.string.NoTone,
    emojiPlugin.string.Light,
    emojiPlugin.string.MediumLight,
    emojiPlugin.string.Medium,
    emojiPlugin.string.MediumDark,
    emojiPlugin.string.Dark
  ].map((label, index) => [index, label])
)
