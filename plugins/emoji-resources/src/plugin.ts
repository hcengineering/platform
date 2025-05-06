import { type IntlString, mergeIds } from '@hcengineering/platform'
import emojiPlugin, { emojiId } from '@hcengineering/emoji'

export default mergeIds(emojiId, emojiPlugin, {
  string: {
    Remove: '' as IntlString,
    SearchResults: '' as IntlString,
    SearchDots: '' as IntlString,
    DefaultSkinTone: '' as IntlString,
    FrequentlyUsed: '' as IntlString,
    GettingWorkDone: '' as IntlString,
    SmileysAndPeople: '' as IntlString,
    AnimalsAndNature: '' as IntlString,
    FoodAndDrink: '' as IntlString,
    TravelAndPlaces: '' as IntlString,
    Activities: '' as IntlString,
    Objects: '' as IntlString,
    Symbols: '' as IntlString,
    Flags: '' as IntlString,
    NoTone: '' as IntlString,
    Light: '' as IntlString,
    MediumLight: '' as IntlString,
    Medium: '' as IntlString,
    MediumDark: '' as IntlString,
    Dark: '' as IntlString
  }
})
