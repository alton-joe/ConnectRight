export type AnimalId =
  | 'cr:fox' | 'cr:wolf' | 'cr:owl' | 'cr:cat' | 'cr:bear' | 'cr:rabbit'
  | 'cr:deer' | 'cr:lion' | 'cr:penguin' | 'cr:panda' | 'cr:tiger' | 'cr:koala'

export interface Animal {
  id: AnimalId
  name: string
  element: React.ReactElement
}

export function isAnimalAvatar(url: string | null | undefined): url is AnimalId {
  return typeof url === 'string' && url.startsWith('cr:')
}

export function getAnimal(id: string): Animal | undefined {
  return ANIMALS.find((a) => a.id === id)
}

export const ANIMALS: Animal[] = [
  {
    id: 'cr:fox',
    name: 'Fox',
    element: (
      <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="20" cy="20" r="20" fill="#BF4D00"/>
        <polygon points="7,18 4,5 15,12" fill="#BF4D00"/>
        <polygon points="8,17 6.5,8 13.5,12.5" fill="#FBBF9D"/>
        <polygon points="33,18 36,5 25,12" fill="#BF4D00"/>
        <polygon points="32,17 33.5,8 26.5,12.5" fill="#FBBF9D"/>
        <circle cx="20" cy="23" r="11.5" fill="#EA580C"/>
        <ellipse cx="20" cy="28.5" rx="5.5" ry="3.5" fill="#FFF1E8"/>
        <circle cx="16" cy="21.5" r="2.3" fill="#1C0800"/>
        <circle cx="24" cy="21.5" r="2.3" fill="#1C0800"/>
        <circle cx="16.7" cy="20.8" r="0.8" fill="white"/>
        <circle cx="24.7" cy="20.8" r="0.8" fill="white"/>
        <ellipse cx="20" cy="27" rx="1.2" ry="0.9" fill="#1C0800"/>
      </svg>
    ),
  },
  {
    id: 'cr:wolf',
    name: 'Wolf',
    element: (
      <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="20" cy="20" r="20" fill="#1E293B"/>
        <polygon points="8,18 5,5 16,12" fill="#334155"/>
        <polygon points="9,17 7,9 14,13" fill="#94A3B8"/>
        <polygon points="32,18 35,5 24,12" fill="#334155"/>
        <polygon points="31,17 33,9 26,13" fill="#94A3B8"/>
        <circle cx="20" cy="23" r="11.5" fill="#475569"/>
        <ellipse cx="20" cy="28.5" rx="5.5" ry="3.5" fill="#CBD5E1"/>
        <circle cx="16" cy="21.5" r="2.3" fill="#0F172A"/>
        <circle cx="24" cy="21.5" r="2.3" fill="#0F172A"/>
        <circle cx="16.7" cy="20.8" r="0.8" fill="white"/>
        <circle cx="24.7" cy="20.8" r="0.8" fill="white"/>
        <ellipse cx="20" cy="27" rx="1.3" ry="1" fill="#0F172A"/>
      </svg>
    ),
  },
  {
    id: 'cr:owl',
    name: 'Owl',
    element: (
      <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="20" cy="20" r="20" fill="#4C1D95"/>
        <polygon points="13,12 11,4 17.5,9" fill="#4C1D95"/>
        <polygon points="27,12 29,4 22.5,9" fill="#4C1D95"/>
        <circle cx="20" cy="22" r="13" fill="#6D28D9"/>
        <circle cx="15.5" cy="21" r="4.5" fill="#FCD34D"/>
        <circle cx="15.5" cy="21" r="2.5" fill="#1C1917"/>
        <circle cx="16.2" cy="20.3" r="0.8" fill="white"/>
        <circle cx="24.5" cy="21" r="4.5" fill="#FCD34D"/>
        <circle cx="24.5" cy="21" r="2.5" fill="#1C1917"/>
        <circle cx="25.2" cy="20.3" r="0.8" fill="white"/>
        <polygon points="18.5,26 21.5,26 20,29" fill="#F59E0B"/>
      </svg>
    ),
  },
  {
    id: 'cr:cat',
    name: 'Cat',
    element: (
      <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="20" cy="20" r="20" fill="#0C4A6E"/>
        <polygon points="9,18 7,6 17,13" fill="#0C4A6E"/>
        <polygon points="10,17 9,9 15.5,13" fill="#F9A8D4"/>
        <polygon points="31,18 33,6 23,13" fill="#0C4A6E"/>
        <polygon points="30,17 31,9 24.5,13" fill="#F9A8D4"/>
        <circle cx="20" cy="23" r="11.5" fill="#0EA5E9"/>
        <ellipse cx="15.5" cy="21" rx="2.5" ry="2" fill="#1C1917"/>
        <ellipse cx="24.5" cy="21" rx="2.5" ry="2" fill="#1C1917"/>
        <ellipse cx="15.5" cy="21" rx="1.1" ry="1.8" fill="#16A34A"/>
        <ellipse cx="24.5" cy="21" rx="1.1" ry="1.8" fill="#16A34A"/>
        <circle cx="16" cy="20.3" r="0.6" fill="white"/>
        <circle cx="25" cy="20.3" r="0.6" fill="white"/>
        <polygon points="19,25.5 21,25.5 20,27.2" fill="#F472B6"/>
        <circle cx="13.5" cy="25" r="0.55" fill="white" opacity="0.7"/>
        <circle cx="15.5" cy="26.2" r="0.55" fill="white" opacity="0.7"/>
        <circle cx="26.5" cy="25" r="0.55" fill="white" opacity="0.7"/>
        <circle cx="24.5" cy="26.2" r="0.55" fill="white" opacity="0.7"/>
      </svg>
    ),
  },
  {
    id: 'cr:bear',
    name: 'Bear',
    element: (
      <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="20" cy="20" r="20" fill="#451A03"/>
        <circle cx="10" cy="11" r="6" fill="#78350F"/>
        <circle cx="30" cy="11" r="6" fill="#78350F"/>
        <circle cx="10" cy="11" r="3.5" fill="#92400E"/>
        <circle cx="30" cy="11" r="3.5" fill="#92400E"/>
        <circle cx="20" cy="23" r="13" fill="#92400E"/>
        <ellipse cx="20" cy="28.5" rx="6" ry="4" fill="#C2956C"/>
        <circle cx="15.5" cy="21" r="2.3" fill="#1C0800"/>
        <circle cx="24.5" cy="21" r="2.3" fill="#1C0800"/>
        <circle cx="16.2" cy="20.3" r="0.7" fill="white"/>
        <circle cx="25.2" cy="20.3" r="0.7" fill="white"/>
        <ellipse cx="20" cy="26.5" rx="1.8" ry="1.2" fill="#1C0800"/>
      </svg>
    ),
  },
  {
    id: 'cr:rabbit',
    name: 'Rabbit',
    element: (
      <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="20" cy="20" r="20" fill="#831843"/>
        <ellipse cx="14" cy="8" rx="4" ry="9" fill="#BE185D"/>
        <ellipse cx="14" cy="8" rx="2.4" ry="7" fill="#FCA5A5"/>
        <ellipse cx="26" cy="8" rx="4" ry="9" fill="#BE185D"/>
        <ellipse cx="26" cy="8" rx="2.4" ry="7" fill="#FCA5A5"/>
        <circle cx="20" cy="24" r="12" fill="#EC4899"/>
        <circle cx="16" cy="22" r="2.2" fill="#1C0800"/>
        <circle cx="24" cy="22" r="2.2" fill="#1C0800"/>
        <circle cx="16.7" cy="21.3" r="0.7" fill="white"/>
        <circle cx="24.7" cy="21.3" r="0.7" fill="white"/>
        <ellipse cx="20" cy="26.5" rx="1.5" ry="1" fill="#FCA5A5"/>
      </svg>
    ),
  },
  {
    id: 'cr:deer',
    name: 'Deer',
    element: (
      <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="20" cy="20" r="20" fill="#78350F"/>
        <line x1="14" y1="14" x2="11" y2="6" stroke="#92400E" strokeWidth="1.8" strokeLinecap="round"/>
        <line x1="11" y1="6" x2="8.5" y2="3" stroke="#92400E" strokeWidth="1.5" strokeLinecap="round"/>
        <line x1="11" y1="6" x2="13.5" y2="3" stroke="#92400E" strokeWidth="1.5" strokeLinecap="round"/>
        <line x1="26" y1="14" x2="29" y2="6" stroke="#92400E" strokeWidth="1.8" strokeLinecap="round"/>
        <line x1="29" y1="6" x2="31.5" y2="3" stroke="#92400E" strokeWidth="1.5" strokeLinecap="round"/>
        <line x1="29" y1="6" x2="26.5" y2="3" stroke="#92400E" strokeWidth="1.5" strokeLinecap="round"/>
        <ellipse cx="10.5" cy="18.5" rx="3.5" ry="5" fill="#B45309" transform="rotate(-20 10.5 18.5)"/>
        <ellipse cx="29.5" cy="18.5" rx="3.5" ry="5" fill="#B45309" transform="rotate(20 29.5 18.5)"/>
        <circle cx="20" cy="24" r="11.5" fill="#D97706"/>
        <ellipse cx="20" cy="28.5" rx="5" ry="3.5" fill="#FDE68A"/>
        <circle cx="16" cy="22" r="2.2" fill="#1C0800"/>
        <circle cx="24" cy="22" r="2.2" fill="#1C0800"/>
        <circle cx="16.7" cy="21.3" r="0.7" fill="white"/>
        <circle cx="24.7" cy="21.3" r="0.7" fill="white"/>
        <ellipse cx="20" cy="27" rx="1.3" ry="1" fill="#1C0800"/>
      </svg>
    ),
  },
  {
    id: 'cr:lion',
    name: 'Lion',
    element: (
      <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="20" cy="20" r="20" fill="#92400E"/>
        <circle cx="20" cy="7"  r="3.5" fill="#D97706"/>
        <circle cx="29.5" cy="10.5" r="3.5" fill="#D97706"/>
        <circle cx="33"   cy="20" r="3.5" fill="#D97706"/>
        <circle cx="29.5" cy="29.5" r="3.5" fill="#D97706"/>
        <circle cx="20"   cy="33" r="3.5" fill="#D97706"/>
        <circle cx="10.5" cy="29.5" r="3.5" fill="#D97706"/>
        <circle cx="7"    cy="20" r="3.5" fill="#D97706"/>
        <circle cx="10.5" cy="10.5" r="3.5" fill="#D97706"/>
        <circle cx="20" cy="20" r="11" fill="#F59E0B"/>
        <circle cx="15.5" cy="18.5" r="2.3" fill="#1C0800"/>
        <circle cx="24.5" cy="18.5" r="2.3" fill="#1C0800"/>
        <circle cx="16.2" cy="17.8" r="0.8" fill="white"/>
        <circle cx="25.2" cy="17.8" r="0.8" fill="white"/>
        <ellipse cx="20" cy="23.5" rx="5" ry="3" fill="#FDE68A" opacity="0.5"/>
        <ellipse cx="20" cy="22" rx="1.5" ry="1.2" fill="#1C0800"/>
      </svg>
    ),
  },
  {
    id: 'cr:penguin',
    name: 'Penguin',
    element: (
      <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="20" cy="20" r="20" fill="#0F172A"/>
        <ellipse cx="20" cy="24" rx="10" ry="12" fill="white"/>
        <circle cx="16" cy="18" r="2.5" fill="#0F172A"/>
        <circle cx="24" cy="18" r="2.5" fill="#0F172A"/>
        <circle cx="16.8" cy="17.3" r="0.8" fill="white"/>
        <circle cx="24.8" cy="17.3" r="0.8" fill="white"/>
        <polygon points="18,22.5 22,22.5 20,25.5" fill="#F97316"/>
      </svg>
    ),
  },
  {
    id: 'cr:panda',
    name: 'Panda',
    element: (
      <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="20" cy="20" r="20" fill="#1F2937"/>
        <circle cx="9"  cy="9"  r="7" fill="#111827"/>
        <circle cx="31" cy="9"  r="7" fill="#111827"/>
        <circle cx="20" cy="23" r="13" fill="white"/>
        <ellipse cx="14.5" cy="21" rx="4" ry="3" fill="#111827" transform="rotate(-15 14.5 21)"/>
        <ellipse cx="25.5" cy="21" rx="4" ry="3" fill="#111827" transform="rotate(15 25.5 21)"/>
        <circle cx="14.5" cy="21" r="1.8" fill="white"/>
        <circle cx="25.5" cy="21" r="1.8" fill="white"/>
        <circle cx="14.5" cy="21" r="1" fill="#111827"/>
        <circle cx="25.5" cy="21" r="1" fill="#111827"/>
        <ellipse cx="20" cy="27" rx="1.5" ry="1" fill="#111827"/>
        <path d="M18 28.5 Q20 30.5 22 28.5" stroke="#111827" strokeWidth="0.8" strokeLinecap="round" fill="none"/>
      </svg>
    ),
  },
  {
    id: 'cr:tiger',
    name: 'Tiger',
    element: (
      <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="20" cy="20" r="20" fill="#C2410C"/>
        <circle cx="10" cy="12" r="5.5" fill="#C2410C"/>
        <circle cx="30" cy="12" r="5.5" fill="#C2410C"/>
        <circle cx="10" cy="12" r="3"   fill="#FCA5A5"/>
        <circle cx="30" cy="12" r="3"   fill="#FCA5A5"/>
        <circle cx="20" cy="23" r="12"  fill="#EA580C"/>
        <path d="M16 14 Q17.5 17.5 16 21" stroke="#7C2D12" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
        <path d="M20 13 Q20 17.5 20 22"   stroke="#7C2D12" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
        <path d="M24 14 Q22.5 17.5 24 21" stroke="#7C2D12" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
        <ellipse cx="20" cy="28.5" rx="5.5" ry="3.5" fill="#FED7AA"/>
        <circle cx="15.5" cy="22" r="2.3" fill="#1C0800"/>
        <circle cx="24.5" cy="22" r="2.3" fill="#1C0800"/>
        <circle cx="16.2" cy="21.3" r="0.7" fill="white"/>
        <circle cx="25.2" cy="21.3" r="0.7" fill="white"/>
        <ellipse cx="20" cy="27" rx="1.3" ry="1" fill="#1C0800"/>
      </svg>
    ),
  },
  {
    id: 'cr:koala',
    name: 'Koala',
    element: (
      <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="20" cy="20" r="20" fill="#374151"/>
        <circle cx="7"  cy="16" r="9"  fill="#4B5563"/>
        <circle cx="33" cy="16" r="9"  fill="#4B5563"/>
        <circle cx="7"  cy="16" r="6"  fill="#9CA3AF"/>
        <circle cx="33" cy="16" r="6"  fill="#9CA3AF"/>
        <circle cx="20" cy="24" r="12" fill="#6B7280"/>
        <ellipse cx="20" cy="26.5" rx="4.5" ry="3.5" fill="#1F2937"/>
        <ellipse cx="20" cy="25.5" rx="2.8" ry="1.5" fill="#374151" opacity="0.5"/>
        <circle cx="15" cy="21.5" r="2.3" fill="#1C1917"/>
        <circle cx="25" cy="21.5" r="2.3" fill="#1C1917"/>
        <circle cx="15.7" cy="20.8" r="0.8" fill="white"/>
        <circle cx="25.7" cy="20.8" r="0.8" fill="white"/>
      </svg>
    ),
  },
]
