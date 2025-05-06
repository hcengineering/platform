import type { IntlString } from '@hcengineering/platform'
import { type EmojiWithGroup } from '@hcengineering/emoji'
import emojiPlugin from './plugin'

export interface EmojiCategory {
  id: string
  label: IntlString
  // icon: AnySvelteComponent
  categories?: string[] | string
  emojisString?: string[]
  emojis?: EmojiWithGroup[]
}

export const emojiCategories: EmojiCategory[] = [
  { id: 'frequently-used', label: emojiPlugin.string.FrequentlyUsed/* , icon: emojiPlugin.component.IconFrequentlyUsed */},
  {
    id: 'getting-work-done',
    label: emojiPlugin.string.GettingWorkDone,
    /* icon: emojiPlugin.component.IconGettingWorkDone, */
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
  {
    id: 'smileys-people',
    label: emojiPlugin.string.SmileysAndPeople,
    /* icon: emojiPlugin.component.IconSmileysAndPeople, */
    categories: ['smileys-emotion', 'people-body']
  },
  {
    id: 'animals-nature',
    label: emojiPlugin.string.AnimalsAndNature,
    /* icon: emojiPlugin.component.IconAnimalsAndNature, */
    categories: 'animals-nature'
  },
  { id: 'food-drink', label: emojiPlugin.string.FoodAndDrink, /* icon: emojiPlugin.component.IconFoodAndDrink, */categories: 'food-drink' },
  { id: 'travel-places', label: emojiPlugin.string.TravelAndPlaces, /* icon: emojiPlugin.component.IconTravelAndPlaces, */categories: 'travel-places' },
  { id: 'activities', label: emojiPlugin.string.Activities, /* icon: emojiPlugin.component.IconActivities, */categories: 'activities' },
  { id: 'objects', label: emojiPlugin.string.Objects, /* icon: emojiPlugin.component.IconObjects, */categories: 'objects' },
  { id: 'symbols', label: emojiPlugin.string.Symbols, /* icon: emojiPlugin.component.IconSymbols, */categories: 'symbols' },
  { id: 'flags', label: emojiPlugin.string.Flags, /*icon: emojiPlugin.component.IconFlags, */categories: 'flags' }
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
