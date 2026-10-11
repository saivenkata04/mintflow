/**
 * MINTFLOW - Gen Z Life Shocks & Serendipity Deck
 */

export const LIFE_EVENTS = [
  {
    id: 'ev-1',
    title: 'Surprise UPI from Grandma 👵',
    description: 'Grandma called asking if you are eating well and sent blessing pocket money!',
    amount: 500,
    type: 'income',
    category: 'social',
    vibe: 'positive',
    tag: 'Family Blessing'
  },
  {
    id: 'ev-2',
    title: 'Uber Surge in Heavy Rain 🌧️',
    description: 'Caught in sudden torrential rain outside campus. Metros were shut, auto surge was brutal.',
    amount: 340,
    type: 'expense',
    category: 'transit',
    vibe: 'negative',
    tag: 'Monsoon Tax'
  },
  {
    id: 'ev-3',
    title: 'Inter-College Hackathon Bounty 🏆',
    description: 'Your team won 2nd place in the campus UI design sprint!',
    amount: 1500,
    type: 'income',
    category: 'social',
    vibe: 'positive',
    tag: 'Skill Payout'
  },
  {
    id: 'ev-4',
    title: 'Sneaky Free Trial Auto-Renewed 🔄',
    description: 'You completely forgot to cancel that photo editing app trial on your phone.',
    amount: 299,
    type: 'expense',
    category: 'subscriptions',
    vibe: 'negative',
    tag: 'Subscription Trap'
  },
  {
    id: 'ev-5',
    title: 'Sold Old Textbooks to Juniors 📚',
    description: 'Cleared your shelf and handed last semester reference guides to the first-years.',
    amount: 450,
    type: 'income',
    category: 'essentials',
    vibe: 'positive',
    tag: 'Campus Hustle'
  },
  {
    id: 'ev-6',
    title: 'Scooter Puncture & Brake Pad 🛵',
    description: 'Rear tire went completely flat near the tea stall. Needed a quick tube patch.',
    amount: 380,
    type: 'expense',
    category: 'transit',
    vibe: 'negative',
    tag: 'Mechanic Visit'
  },
  {
    id: 'ev-7',
    title: 'Friend\'s Birthday Group Treat Share 🎂',
    description: 'The whole squad split a café cake and gift basket.',
    amount: 420,
    type: 'expense',
    category: 'social',
    vibe: 'negative',
    tag: 'Squad Obligation'
  },
  {
    id: 'ev-8',
    title: 'Splitwise Settlement Arrived 📱',
    description: 'A friend finally settled their pending dinner dues after two weeks.',
    amount: 360,
    type: 'income',
    category: 'social',
    vibe: 'positive',
    tag: 'Debt Reclaimed'
  }
];

export function getRandomLifeEvent() {
  const idx = Math.floor(Math.random() * LIFE_EVENTS.length);
  return LIFE_EVENTS[idx];
}
