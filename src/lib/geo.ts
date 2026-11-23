// Geographic reference data for the Americas: the app serves US and Caribbean
// clients, so state/region lists are US-centric with Caribbean territories and
// a free-text fallback for everything else.

export type Country = { code: string; name: string; us: boolean }

export const COUNTRIES: Country[] = [
  { code: 'US', name: 'United States', us: true },
  { code: 'PR', name: 'Puerto Rico', us: true },
  { code: 'VI', name: 'U.S. Virgin Islands', us: true },
  { code: 'GU', name: 'Guam', us: true },
  { code: 'CA', name: 'Canada', us: false },
  { code: 'MX', name: 'Mexico', us: false },
  { code: 'JM', name: 'Jamaica', us: false },
  { code: 'TT', name: 'Trinidad and Tobago', us: false },
  { code: 'BS', name: 'Bahamas', us: false },
  { code: 'BB', name: 'Barbados', us: false },
  { code: 'DO', name: 'Dominican Republic', us: false },
  { code: 'HT', name: 'Haiti', us: false },
  { code: 'CU', name: 'Cuba', us: false },
  { code: 'KY', name: 'Cayman Islands', us: false },
  { code: 'BM', name: 'Bermuda', us: false },
  { code: 'AW', name: 'Aruba', us: false },
  { code: 'CW', name: 'Curaçao', us: false },
  { code: 'AG', name: 'Antigua and Barbuda', us: false },
  { code: 'BZ', name: 'Belize', us: false },
  { code: 'GD', name: 'Grenada', us: false },
  { code: 'LC', name: 'Saint Lucia', us: false },
  { code: 'KN', name: 'Saint Kitts and Nevis', us: false },
  { code: 'VC', name: 'Saint Vincent and the Grenadines', us: false },
  { code: 'DM', name: 'Dominica', us: false },
  { code: 'GY', name: 'Guyana', us: false },
  { code: 'SR', name: 'Suriname', us: false },
  { code: 'PA', name: 'Panama', us: false },
  { code: 'CR', name: 'Costa Rica', us: false },
  { code: 'GT', name: 'Guatemala', us: false },
  { code: 'HN', name: 'Honduras', us: false },
  { code: 'SV', name: 'El Salvador', us: false },
  { code: 'NI', name: 'Nicaragua', us: false },
  { code: 'CO', name: 'Colombia', us: false },
  { code: 'VE', name: 'Venezuela', us: false },
  { code: 'EC', name: 'Ecuador', us: false },
  { code: 'BR', name: 'Brazil', us: false },
  { code: 'CL', name: 'Chile', us: false },
  { code: 'AR', name: 'Argentina', us: false },
  { code: 'PE', name: 'Peru', us: false },
  { code: 'UY', name: 'Uruguay', us: false },
  { code: 'PY', name: 'Paraguay', us: false },
  { code: 'BO', name: 'Bolivia', us: false },
  { code: 'OTHER', name: 'Other', us: false },
]

export const DEFAULT_COUNTRY = 'United States'

export const COUNTRY_NAMES = COUNTRIES.map((c) => c.name)

/** US states + DC + territories, as region suggestions. */
export const US_REGIONS = [
  'Alabama (AL)', 'Alaska (AK)', 'Arizona (AZ)', 'Arkansas (AR)', 'California (CA)',
  'Colorado (CO)', 'Connecticut (CT)', 'Delaware (DE)', 'District of Columbia (DC)',
  'Florida (FL)', 'Georgia (GA)', 'Hawaii (HI)', 'Idaho (ID)', 'Illinois (IL)',
  'Indiana (IN)', 'Iowa (IA)', 'Kansas (KS)', 'Kentucky (KY)', 'Louisiana (LA)',
  'Maine (ME)', 'Maryland (MD)', 'Massachusetts (MA)', 'Michigan (MI)', 'Minnesota (MN)',
  'Mississippi (MS)', 'Missouri (MO)', 'Montana (MT)', 'Nebraska (NE)', 'Nevada (NV)',
  'New Hampshire (NH)', 'New Jersey (NJ)', 'New Mexico (NM)', 'New York (NY)',
  'North Carolina (NC)', 'North Dakota (ND)', 'Ohio (OH)', 'Oklahoma (OK)', 'Oregon (OR)',
  'Pennsylvania (PA)', 'Rhode Island (RI)', 'South Carolina (SC)', 'South Dakota (SD)',
  'Tennessee (TN)', 'Texas (TX)', 'Utah (UT)', 'Vermont (VT)', 'Virginia (VA)',
  'Washington (WA)', 'West Virginia (WV)', 'Wisconsin (WI)', 'Wyoming (WY)',
  'Puerto Rico (PR)', 'U.S. Virgin Islands (VI)', 'Guam (GU)', 'American Samoa (AS)',
  'Northern Mariana Islands (MP)',
]

/** Caribbean / Latin American regions, offered in the same suggestion list. */
export const REGION_EXTRA = [
  'Ontario', 'Quebec', 'British Columbia', 'Alberta', 'Nova Scotia',
  'Kingston', 'Montego Bay', 'Port of Spain', 'San Juan', 'Santo Domingo',
  'Nassau', 'Bridgetown', 'George Town', 'Hamilton', 'Oranjestad', 'Willemstad',
  'Belize City', 'St. George\u2019s', 'Castries', 'Basseterre', 'Kingstown', 'Roseau',
  'Georgetown', 'Paramaribo', 'Panama City', 'San José', 'Guatemala City',
  'Tegucigalpa', 'San Salvador', 'Managua', 'Bogotá', 'Caracas', 'Quito',
  'São Paulo', 'Santiago', 'Buenos Aires', 'Lima', 'Montevideo', 'Asunción', 'La Paz',
]

/** Suggestions for the "State / Region" field (free text is still accepted). */
export const REGION_SUGGESTIONS = [...US_REGIONS, ...REGION_EXTRA]

export function countryByCode(code: string | null | undefined): Country | undefined {
  return COUNTRIES.find((c) => c.code === String(code || '').toUpperCase())
}

/** Industry list shared by the admin form and the public sign-up form. */
export const CLIENT_VERTICALS = [
  'Healthcare',
  'Financial services',
  'Insurance',
  'Retail',
  'Manufacturing',
  'Technology',
  'Education',
  'Logistics',
  'Energy',
  'Hospitality',
  'Government / public sector',
  'Professional services',
  'Telecommunications',
  'Other',
]

/** Headcount bands shared by the admin form and the public sign-up form. */
export const CLIENT_SIZES = [
  '1 to 50 employees',
  '51 to 200 employees',
  '201 to 500 employees',
  '501 to 1,000 employees',
  '1,001 to 5,000 employees',
  'More than 5,000 employees',
]

export const VERTICAIS_PUBLIC = CLIENT_VERTICALS
export const PORTES_PUBLIC = CLIENT_SIZES

/** Short location line, e.g. "Miami · Florida (FL) · United States". */
export function locationLine(
  city: string | null | undefined,
  region: string | null | undefined,
  country: string | null | undefined
): string {
  return [city, region, country].filter((v) => !!v && String(v).trim() !== '').join(' · ')
}
