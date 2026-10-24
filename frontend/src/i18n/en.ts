// Every user-facing string lives here and in sw.ts. Add keys to both.
export const en = {
  'app.name': 'Haki Afya',
  'app.tagline': 'See what SHA should cover, before you pay.',

  'lang.label': 'Language',
  'lang.en': 'EN',
  'lang.sw': 'SW',

  'footer.disclaimer': 'Not legal or medical advice.',
  'footer.about': 'How it works',

  'nav.home': 'Home',
  'nav.back': 'Back',

  'placeholder.title': 'Coming soon',
  'placeholder.body': 'This page is being built.',

  'notFound.title': 'Page not found',
  'notFound.body': "We couldn't find that page.",

  'error.generic': 'Something went wrong. Try again.',
  'error.retry': 'Try again',

  'page.home': 'Home',
  'page.check.facility': 'Which facility?',
  'page.check.questions': 'Two quick questions',
  'page.check.photo': 'Photo of your bill',
  'page.check.result': 'Your bill check',
  'page.find': 'What care do you need?',
  'page.emergency': 'Emergency',
  'page.find.results': 'Facilities near you',
  'page.about': 'How it works',
} as const

export type StringKey = keyof typeof en
