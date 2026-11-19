import type { SponsorAd } from '../types/sale';

export const SPONSOR_ADS: readonly SponsorAd[] = [
  {
    id: 'ad-coffee',
    sponsor: 'Riverbend Roasters',
    title: 'Morning fuel before the hunt',
    subtitle: '20% off iced oat lattes & warm croissants before noon.',
    details:
      'Stop by Riverbend Roasters on Main St before heading out to Saturday sales. Show this Stoop neighborhood code at the counter for 20% off any espresso drink and pastry pairing before 12:00 PM.',
    meta: 'Main St · Open 6:30 AM',
    cta: 'Get 20% off',
    code: 'STOOP20',
    image: '/src/assets/images/ad_coffee_shop_1795014773665.jpg',
  },
  {
    id: 'ad-moving',
    sponsor: 'Oakwood Moving Co.',
    title: 'Free weekend box bundle',
    subtitle: 'Hauling home a dresser or clearing a garage? Grab 10 boxes on us.',
    details:
      'Hosting a moving sale or picking up big furniture finds? Oakwood Moving Co. offers a complimentary 10-pack of heavy-duty boxes and packing paper plus discounted hourly cargo van rentals all weekend.',
    meta: 'Local pickup · Van rentals',
    cta: 'Claim bundle',
    code: 'WEEKEND10',
    image: '/src/assets/images/ad_moving_boxes_1795014774801.jpg',
  },
  {
    id: 'ad-vintage',
    sponsor: 'Hearthstone Vintage',
    title: 'Curated mid-century & decor',
    subtitle: 'Restored credenzas, stoneware & botanical prints open all weekend.',
    details:
      'Didn’t find that statement piece on the curb? Browse restored walnut furniture, vintage lighting, and local consignments at Hearthstone Vintage—plus take 15% off one small home accessory this weekend.',
    meta: 'Haynie’s Corner · Sat–Sun 9–5',
    cta: 'View offer',
    code: 'HEARTH15',
    image: '/src/assets/images/ad_vintage_shop_1795014775999.jpg',
  },
];
