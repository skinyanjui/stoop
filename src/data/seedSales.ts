import type { PaymentMethod, Sale, SaleType } from '../types/sale';
import { addDays, iso, TODAY } from '../utils/format';

export const SALE_TYPES: readonly SaleType[] = [
  'Garage Sale',
  'Flea Market',
  'Car Boot Sale',
] as const;

export const saleTypeOf = (v: unknown): SaleType =>
  typeof v === 'string' && (SALE_TYPES as readonly string[]).includes(v)
    ? (v as SaleType)
    : 'Garage Sale';

export const CATS = [
  'Furniture', 'Tools', 'Clothing', 'Kids', 'Electronics', 'Antiques',
  'Household', 'Books', 'Toys', 'Sports & outdoors', 'Garden', 'Kitchen',
  'Appliances', 'Music', 'Games', 'Baby', 'Jewelry', 'Art & decor',
  'Auto parts', 'Crafts', 'Collectibles', 'Holiday', 'Bikes', 'Pets', 'Free stuff',
] as const;

export const CATALOG: Record<string, readonly string[]> = {
  Furniture: ['Couch', 'Sectional', 'Dining table', 'Dining chairs', 'Dresser', 'Bookshelf', 'Desk', 'Bed frame', 'Mattress', 'Nightstand', 'Office chair', 'Coffee table', 'Bar stools', 'Sideboard'],
  Tools: ['Table saw', 'Drill', 'Impact driver', 'Socket set', 'Wrenches', 'Workbench', 'Tool chest', 'Welder', 'Air compressor', 'Ladder', 'Bench grinder', 'Lawn mower', 'Hand tools', 'Pressure washer'],
  Clothing: ['Jackets', 'Jeans', 'Dresses', 'Shoes', 'Boots', 'Vintage clothes', 'Coats', 'Purses', 'Scarves'],
  Kids: ['Stroller', 'Toys', 'Kids bike', 'Car seat', 'Crib', 'Board games', 'Baby clothes', 'High chair', 'LEGO'],
  Electronics: ['TV', 'Monitor', 'Laptop', 'Speakers', 'Record player', 'Game console', 'Printer', 'Headphones', 'Camera'],
  Antiques: ['Cast iron', 'Depression glass', 'Vintage lamps', 'Vinyl records', 'Quilts', 'Clocks', 'Pottery', 'Framed art', 'Coins'],
  Household: ['Dishes', 'Cookware', 'Small appliances', 'Lamps', 'Rugs', 'Curtains', 'Holiday decor', 'Camping gear', 'Fishing gear', 'Plants', 'Mirrors', 'Bikes'],
  Books: ['Paperbacks', 'Hardcovers', 'Cookbooks', 'Textbooks', 'Comics', 'Magazines', 'Board books'],
};

export const CURRENCIES: Record<string, [number, string]> = {
  USD: [1, 'US dollar'], CAD: [0.73, 'Canadian dollar'], GBP: [1.27, 'British pound'],
  EUR: [1.08, 'Euro'], AUD: [0.65, 'Australian dollar'], NZD: [0.6, 'New Zealand dollar'],
  SEK: [0.095, 'Swedish krona'], JPY: [0.0066, 'Japanese yen'], PHP: [0.017, 'Philippine peso'],
  KES: [0.0077, 'Kenyan shilling'], NGN: [0.00065, 'Nigerian naira'], ZAR: [0.055, 'South African rand'],
  GHS: [0.07, 'Ghanaian cedi'], INR: [0.012, 'Indian rupee'], BRL: [0.18, 'Brazilian real'],
  MXN: [0.055, 'Mexican peso'], ARS: [0.001, 'Argentine peso'], SGD: [0.74, 'Singapore dollar'],
  AED: [0.27, 'UAE dirham'],
};

export const CC_CUR: Record<string, string> = {
  us: 'USD', ca: 'CAD', gb: 'GBP', ie: 'EUR', de: 'EUR', nl: 'EUR', fr: 'EUR', es: 'EUR',
  it: 'EUR', be: 'EUR', at: 'EUR', pt: 'EUR', fi: 'EUR', au: 'AUD', nz: 'NZD', se: 'SEK',
  jp: 'JPY', ph: 'PHP', ke: 'KES', ng: 'NGN', za: 'ZAR', gh: 'GHS', in: 'INR', br: 'BRL',
  mx: 'MXN', ar: 'ARS', sg: 'SGD', ae: 'AED',
};

export const curOf = (s?: Partial<Sale> | null): string =>
  s && s.cur && CURRENCIES[s.cur] ? s.cur : 'USD';

export const PAYMENTS: PaymentMethod[] = [
  { id: 'cash', label: 'Cash', icon: 'cash' },
  { id: 'card', label: 'Card', icon: 'card' },
  { id: 'nfc', label: 'Tap to pay (NFC)', icon: 'nfc' },
  { id: 'applepay', label: 'Apple Pay', mono: 'AP' },
  { id: 'googlepay', label: 'Google Pay', mono: 'GP' },
  { id: 'venmo', label: 'Venmo', mono: 'Ve' },
  { id: 'cashapp', label: 'Cash App', mono: 'CA' },
  { id: 'zelle', label: 'Zelle', mono: 'Ze' },
  { id: 'paypal', label: 'PayPal', mono: 'PP' },
  { id: 'check', label: 'Check', icon: 'check' },
  { id: 'mpesa', label: 'M-Pesa', mono: 'MP' },
  { id: 'upi', label: 'UPI', mono: 'UPI' },
  { id: 'pix', label: 'Pix', mono: 'Px' },
  { id: 'etransfer', label: 'Interac e-Transfer', mono: 'eT' },
  { id: 'bank', label: 'Bank transfer', mono: 'Bk' },
];

export const payOf = (id: string): PaymentMethod | undefined =>
  PAYMENTS.find((x) => x.id === id);

const SEED_ITEMS: Record<string, string[]> = {
  "Haynie's Corner block sale": ['Dresser', 'Cookware', 'Vinyl records', 'Paperbacks', 'Lamps'],
  'Estate sale: HVAC & shop tools': ['Welder', 'Wrenches', 'Tool chest', 'Hand tools', 'Workbench'],
  "Kids' clothes & gear": ['Baby clothes', 'Stroller', 'Toys', 'Crib', 'Kids bike'],
  'Moving sale, everything must go': ['Sectional', 'TV', 'Desk', 'Cookware', 'Dining table'],
  'Vintage & antiques': ['Depression glass', 'Cast iron', 'Bookshelf', 'Paperbacks'],
  'Downtown loft clear-out': ['Desk', 'Monitor', 'Bar stools', 'Record player'],
  'Darmstadt neighborhood sale': ['Lawn mower', 'Kids bike', 'Holiday decor', 'Drill'],
  'Garage cleanout: tools & fishing': ['Fishing gear', 'Bench grinder', 'Drill', 'Tool chest'],
  'Highlands yard sale': ['Vintage clothes', 'Cookware', 'Plants'],
  'Old Louisville antiques & books': ['Dresser', 'Framed art', 'Paperbacks', 'Hardcovers'],
  'East Nashville block sale': ['Speakers', 'Kids bike', 'Dining chairs', 'Record player'],
  'Sylvan Park garage sale': ['Workbench', 'Hand tools', 'Camping gear', 'Ladder'],
  'South Austin moving sale': ['Couch', 'TV', 'Dining table', 'Mattress'],
  'Hyde Park multi-family sale': ['Baby clothes', 'Board books', 'Stroller', 'Toys'],
  'Alberta Arts estate sale': ['Vintage lamps', 'Pottery', 'Sideboard'],
  'Sellwood tools & bikes': ['Kids bike', 'Hand tools', 'Pressure washer'],
  'Newburgh riverside yard sale': ['Patio chairs', 'Porch swing', 'Planters', 'Mixing bowls'],
  'Pigeon Creek multi-family': ['Winter coats', 'Lego sets', 'Scooter', 'Board games'],
  'Henderson attic cleanout': ['Postcards', 'Costume jewelry', 'Victrola', 'Tin signs'],
  'Boonville workshop sale': ['Socket set', 'Jack stands', 'Shop vac', 'Air compressor'],
  'Eastside baby & maternity': ['Baby swing', 'Carrier', 'Bouncer', 'Onesies'],
  'Mt. Vernon vinyl & stereo': ['Vinyl records', 'Receiver', 'Speakers', 'Turntable'],
  'Haubstadt farm auction cleanup': ['Garden tiller', 'Post hole digger', 'Chains', 'Hand tools'],
  'University Heights dorm clearout': ['Mini fridge', 'Futon', 'Microwave', 'Monitor'],
  'Cypress Dale craft supplies': ['Fabric', 'Yarn', 'Sewing machine', 'Picture frames'],
  'Warrick County bikes & sports': ['Mountain bike', 'Kayak', 'Helmets', 'Fishing rods'],
  'Franklin Street thrift pop-up': ['Jeans', 'Jackets', 'Glassware', 'Dresses'],
  'Newburgh holiday decor sale': ['Artificial tree', 'String lights', 'Wreaths', 'Ornaments'],
  'Oak Hill bar & kitchen sale': ['Stand mixer', 'Air fryer', 'Cast iron set', 'Dish set'],
  'Stockwell Road game night haul': ['Retro console', 'Board games', 'Card binders', 'Controllers'],
  'Henderson patio & garden': ['Patio table set', 'Fire pit', 'Hose reels', 'Clay pots'],
  'Lloyd Expressway pet supply sale': ['Dog crate', 'Cat tree', 'Aquarium', 'Dog beds'],
  'Green River art & decor': ['Framed prints', 'Mirrors', 'Side tables', 'Pottery'],
  'Chandler church rummage': ['Books by the bag', 'Linens', 'Clothing', 'Kitchen items'],
  'Diamond Ave jewelry & watches': ['Wristwatches', 'Coin collection', 'Figurines', 'Silver set'],
  'West Side garage blowout': ['Power tools', 'Rolling toolbox', 'Floor jack', 'Tires'],
  'Princeton garage & grill sale': ['Gas grill', 'Cooler', 'Camp stove', 'Cast iron pan'],
  'Owensboro lakeside cleanout': ['Canoe', 'Life jackets', 'Tackle box', 'Lake decor'],
  'Jasper craftsman furniture sale': ['Oak table', 'Bookcase', 'Rocking chair', 'Quilt rack'],
  'Poseyville church yard sale': ['Kids books', 'Baked goods', 'Puzzles', 'Casserole dishes'],
  'Rockport river view estate sale': ['Pocket watches', 'Mantel clock', 'Hand planes', 'Postcards'],
  'Cannelton hardware closeout': ['Fasteners', 'Drill bits', 'Paint', 'Ladders'],
  'Evansville Garvin Park yard sale': ['Sofa', 'Lamps', 'Frames', 'Rugs'],
  'Helfrich Park moving sale': ['Washer', 'Dryer', 'Bedroom set', 'Microwave'],
  'McCutchanville estate tools': ['Riding mower', 'Table saw', 'Trimmers', 'Clamps'],
  'Newburgh vintage clothing sale': ['Dresses', 'Denim jackets', 'Hats', 'Boots'],
  'Henderson kids outgrown sale': ['Kids bikes', 'Ride on toys', 'Clothes', 'Car seat'],
  'Mt. Carmel garden club plant sale': ['Perennials', 'Herbs', 'Painted pots', 'Seed packets'],
  'Ferdinand quilts & crafts': ['Quilts', 'Yarn', 'Beads', 'Frames'],
  'Fort Branch garage music sale': ['Acoustic guitar', 'Amp', 'Drum kit', 'Mic stands'],
  'Indianapolis Fountain Square sale': ['Canvases', 'Shelving', 'Easels', 'Stools'],
  'St. Louis Soulard block sale': ['Cast iron', 'Crocks', 'Chairs', 'Mirrors'],
  'Chicago Logan Square garage sale': ['Records', 'Books', 'Jackets', 'Sneakers'],
  'Atlanta Grant Park yard sale': ['Porch swing', 'Planters', 'Rocking chairs', 'Rugs'],
  'Denver Baker neighborhood sale': ['Skis', 'Snowboard', 'Bike parts', 'Helmets'],
  'Phoenix Coronado garage sale': ['Swamp cooler', 'Tool sets', 'Patio set', 'Fans'],
  'Seattle Ballard moving sale': ['Desk', 'Kitchen gear', 'Bookshelf', 'Lamps'],
  'Minneapolis Northeast tool sale': ['Wrenches', 'Jack', 'Creeper', 'Oil filters'],
  'Nashville Germantown block sale': ['Signs', 'Vintage art', 'Frames', 'Trunk'],
  'Car boot sale, Wimbledon': ['Tea sets', 'Jumpers', 'Paperbacks', 'Garden tools'],
  'Car boot sale, Heaton Park': ['Toys', 'DVDs', 'Bedside tables', 'Prams'],
  'Dublin garage sale, Rathmines': ['Armchair', 'Books', 'Mirror', 'Lamp'],
  'Hofflohmarkt Prenzlauer Berg': ['Vinyl', 'Porcelain', 'Kinderbücher', 'Fahrräder'],
  'Vrijmarkt Utrecht': ['Kleding', 'Boeken', 'Fietsmanden', 'Speelgoed'],
  'Vide-grenier de la Croix-Rousse': ['Vaisselle', 'Livres', 'Affiches', 'Meubles'],
  'El Rastro de Madrid': ['Cuadros', 'Cerámica', 'Discos', 'Relojes'],
  'Loppis Sodermalm': ['Glas', 'Textilier', 'Böcker', 'Lampor'],
  'Garage sale, Bondi': ['Surfboards', 'Wetsuits', 'Beach chairs', 'Bikes'],
  'Garage sale, Ponsonby': ['Dresser', 'Dresses', 'Records', 'Plants'],
  'Yard sale, Roncesvalles': ['Skates', 'Kids books', 'Lamps', 'Strollers'],
  'Garage sale, Quezon City': ['Clothes', 'Bags', 'Phones', 'Fans'],
  'Garage sale, Kilimani Nairobi': ['Sofa set', 'Books', 'Kids clothes', 'Kettle'],
  'Mitumba day, Isiolo': ['Jackets', 'Shoes', 'Bags', 'Blankets'],
  'Garage sale, Lekki Lagos': ['TV', 'Standing fan', 'Sofa', 'Generator'],
  'Car boot sale, Constantia Cape Town': ['Braai set', 'Bicycles', 'Toys', 'Crockery'],
  'Garage sale, Osu Accra': ['Fabric', 'Dresses', 'Pots', 'Sandals'],
  'Garage sale, Koramangala': ['Books', 'Laptop', 'Bicycle', 'Speakers'],
  'Bazar de garagem, Vila Madalena': ['Roupas', 'Discos', 'Quadros', 'Livros'],
  'Venta de garaje, Roma Norte': ['Muebles', 'Libros', 'Cerámica', 'Lamparas'],
  'Venta de garage, Palermo': ['Ropa', 'Libros', 'Discos', 'Plantas'],
  'Garage sale, Tokyo Setagaya': ['Kimono', 'Dishes', 'Vinyl', 'Books'],
  'Garage sale, Tiong Bahru': ['Bookshelf', 'Books', 'Rice cooker', 'Fans'],
  'Garage sale, Dubai Marina': ['Sofa', 'TV', 'Kids bike', 'Dining table'],
};

const SEED_PAY: Record<string, string[]> = {
  "Haynie's Corner block sale": ['cash', 'venmo', 'cashapp'],
  'Estate sale: HVAC & shop tools': ['cash', 'card', 'nfc', 'applepay'],
  "Kids' clothes & gear": ['cash', 'venmo', 'applepay'],
  'Moving sale, everything must go': ['cash', 'venmo', 'zelle', 'card'],
  'Vintage & antiques': ['cash', 'card', 'nfc', 'check'],
  'Downtown loft clear-out': ['venmo', 'cashapp', 'applepay', 'cash'],
  'Darmstadt neighborhood sale': ['cash'],
  'Garage cleanout: tools & fishing': ['cash', 'cashapp'],
  'Newburgh riverside yard sale': ['cash', 'venmo'],
  'Pigeon Creek multi-family': ['cash', 'cashapp', 'applepay'],
  'Henderson attic cleanout': ['cash', 'card', 'check'],
  'Boonville workshop sale': ['cash', 'card'],
  'Eastside baby & maternity': ['cash', 'venmo', 'zelle'],
  'Mt. Vernon vinyl & stereo': ['cash', 'venmo', 'cashapp'],
  'Haubstadt farm auction cleanup': ['cash', 'check'],
  'University Heights dorm clearout': ['venmo', 'cashapp', 'applepay'],
  'Cypress Dale craft supplies': ['cash', 'venmo'],
  'Warrick County bikes & sports': ['cash', 'card', 'nfc'],
  'Franklin Street thrift pop-up': ['cash', 'cashapp'],
  'Newburgh holiday decor sale': ['cash', 'venmo', 'applepay'],
  'Oak Hill bar & kitchen sale': ['cash', 'venmo', 'zelle'],
  'Stockwell Road game night haul': ['cash', 'venmo', 'cashapp'],
  'Henderson patio & garden': ['cash', 'card'],
  'Lloyd Expressway pet supply sale': ['cash', 'venmo'],
  'Green River art & decor': ['cash', 'card', 'applepay'],
  'Chandler church rummage': ['cash', 'check'],
  'Diamond Ave jewelry & watches': ['cash', 'card', 'nfc'],
  'West Side garage blowout': ['cash', 'cashapp'],
  'Princeton garage & grill sale': ['cash', 'venmo'],
  'Owensboro lakeside cleanout': ['cash', 'cashapp'],
  'Jasper craftsman furniture sale': ['cash', 'check', 'card'],
  'Poseyville church yard sale': ['cash', 'check'],
  'Rockport river view estate sale': ['cash', 'card'],
  'Cannelton hardware closeout': ['cash', 'card', 'nfc'],
  'Evansville Garvin Park yard sale': ['cash', 'venmo', 'applepay'],
  'Helfrich Park moving sale': ['cash', 'venmo', 'zelle'],
  'McCutchanville estate tools': ['cash', 'check'],
  'Newburgh vintage clothing sale': ['cash', 'venmo', 'cashapp'],
  'Henderson kids outgrown sale': ['cash', 'venmo'],
  'Mt. Carmel garden club plant sale': ['cash', 'check'],
  'Ferdinand quilts & crafts': ['cash', 'check', 'card'],
  'Fort Branch garage music sale': ['cash', 'venmo', 'cashapp'],
  'Indianapolis Fountain Square sale': ['cash', 'venmo', 'applepay'],
  'St. Louis Soulard block sale': ['cash', 'venmo', 'cashapp'],
  'Chicago Logan Square garage sale': ['venmo', 'applepay', 'cash'],
  'Atlanta Grant Park yard sale': ['cash', 'venmo', 'cashapp'],
  'Denver Baker neighborhood sale': ['cash', 'venmo', 'applepay'],
  'Phoenix Coronado garage sale': ['cash', 'cashapp', 'applepay'],
  'Seattle Ballard moving sale': ['venmo', 'applepay', 'cash'],
  'Minneapolis Northeast tool sale': ['cash', 'venmo'],
  'Nashville Germantown block sale': ['cash', 'venmo', 'applepay'],
  'Car boot sale, Wimbledon': ['cash', 'card'],
  'Car boot sale, Heaton Park': ['cash', 'paypal'],
  'Dublin garage sale, Rathmines': ['cash', 'card'],
  'Hofflohmarkt Prenzlauer Berg': ['cash', 'bank'],
  'Vrijmarkt Utrecht': ['cash', 'card'],
  'Vide-grenier de la Croix-Rousse': ['cash', 'check'],
  'El Rastro de Madrid': ['cash', 'card'],
  'Loppis Sodermalm': ['cash', 'card'],
  'Garage sale, Bondi': ['cash', 'card', 'applepay'],
  'Garage sale, Ponsonby': ['cash', 'bank'],
  'Yard sale, Roncesvalles': ['cash', 'etransfer'],
  'Garage sale, Quezon City': ['cash', 'bank'],
  'Garage sale, Kilimani Nairobi': ['mpesa', 'cash'],
  'Mitumba day, Isiolo': ['mpesa', 'cash'],
  'Garage sale, Lekki Lagos': ['bank', 'cash'],
  'Car boot sale, Constantia Cape Town': ['cash', 'card'],
  'Garage sale, Osu Accra': ['mpesa', 'cash'],
  'Garage sale, Koramangala': ['upi', 'cash'],
  'Bazar de garagem, Vila Madalena': ['pix', 'cash'],
  'Venta de garaje, Roma Norte': ['cash', 'card'],
  'Venta de garage, Palermo': ['cash', 'bank'],
  'Garage sale, Tokyo Setagaya': ['cash'],
  'Garage sale, Tiong Bahru': ['cash', 'bank'],
  'Garage sale, Dubai Marina': ['cash', 'card'],
};

const SEED_PRICES: Record<string, Record<string, number>> = {
  'Estate sale: HVAC & shop tools': { Welder: 150, Wrenches: 12, 'Tool chest': 120, 'Hand tools': 5, Workbench: 80 },
  'Moving sale, everything must go': { Sectional: 250, TV: 150, Desk: 80, Cookware: 15, 'Dining table': 120 },
  "Kids' clothes & gear": { 'Baby clothes': 3, Stroller: 25, Toys: 2, Crib: 40, 'Kids bike': 15 },
  'Newburgh riverside yard sale': { 'Patio chairs': 12, 'Porch swing': 45, Planters: 4 },
  'Pigeon Creek multi-family': { 'Winter coats': 8, 'Lego sets': 10, Scooter: 12 },
  'Henderson attic cleanout': { Victrola: 150, 'Tin signs': 18, 'Costume jewelry': 6 },
  'Boonville workshop sale': { 'Socket set': 25, 'Jack stands': 30, 'Air compressor': 110 },
  'Eastside baby & maternity': { 'Baby swing': 30, Carrier: 20, Onesies: 2 },
  'Mt. Vernon vinyl & stereo': { 'Vinyl records': 5, Receiver: 60, Speakers: 90, Turntable: 70 },
  'Haubstadt farm auction cleanup': { 'Garden tiller': 140, 'Post hole digger': 35, 'Hand tools': 10 },
  'University Heights dorm clearout': { 'Mini fridge': 40, Futon: 55, Microwave: 15, Monitor: 45 },
  'Cypress Dale craft supplies': { Fabric: 3, Yarn: 2, 'Sewing machine': 60 },
  'Warrick County bikes & sports': { 'Mountain bike': 120, Kayak: 180, Helmets: 8, 'Fishing rods': 15 },
  'Franklin Street thrift pop-up': { Jeans: 6, Jackets: 10, Glassware: 3 },
  'Newburgh holiday decor sale': { 'Artificial tree': 35, 'String lights': 4, Wreaths: 8 },
  'Oak Hill bar & kitchen sale': { 'Stand mixer': 70, 'Air fryer': 30, 'Cast iron set': 45, 'Dish set': 25 },
  'Stockwell Road game night haul': { 'Retro console': 90, 'Board games': 5, Controllers: 10 },
  'Henderson patio & garden': { 'Patio table set': 85, 'Fire pit': 40, 'Clay pots': 3 },
  'Lloyd Expressway pet supply sale': { 'Dog crate': 25, 'Cat tree': 20, Aquarium: 30 },
  'Green River art & decor': { 'Framed prints': 15, Mirrors: 40, 'Side tables': 25 },
  'Chandler church rummage': { 'Books by the bag': 5 },
  'Diamond Ave jewelry & watches': { Wristwatches: 45, Figurines: 10 },
  'West Side garage blowout': { 'Power tools': 40, 'Rolling toolbox': 75, 'Floor jack': 35, Tires: 20 },
  'Princeton garage & grill sale': { 'Gas grill': 60, Cooler: 12, 'Camp stove': 25, 'Cast iron pan': 15 },
  'Owensboro lakeside cleanout': { Canoe: 140, 'Life jackets': 8, 'Tackle box': 10, 'Lake decor': 6 },
  'Jasper craftsman furniture sale': { 'Oak table': 180, Bookcase: 90, 'Rocking chair': 55, 'Quilt rack': 25 },
  'Poseyville church yard sale': { 'Kids books': 1, 'Baked goods': 3, Puzzles: 2, 'Casserole dishes': 4 },
  'Rockport river view estate sale': { 'Pocket watches': 35, 'Mantel clock': 75, 'Hand planes': 12, Postcards: 1 },
  'Cannelton hardware closeout': { Fasteners: 3, 'Drill bits': 8, Paint: 10, Ladders: 40 },
  'Evansville Garvin Park yard sale': { Sofa: 90, Lamps: 10, Frames: 4, Rugs: 25 },
  'Helfrich Park moving sale': { Washer: 150, Dryer: 130, 'Bedroom set': 300, Microwave: 20 },
  'McCutchanville estate tools': { 'Riding mower': 450, 'Table saw': 140, Trimmers: 25, Clamps: 6 },
  'Newburgh vintage clothing sale': { Dresses: 15, 'Denim jackets': 20, Hats: 8, Boots: 18 },
  'Henderson kids outgrown sale': { 'Kids bikes': 15, 'Ride on toys': 10, Clothes: 2, 'Car seat': 30 },
  'Mt. Carmel garden club plant sale': { Perennials: 6, Herbs: 3, 'Painted pots': 8, 'Seed packets': 1 },
  'Ferdinand quilts & crafts': { Quilts: 70, Yarn: 2, Beads: 3, Frames: 5 },
  'Fort Branch garage music sale': { 'Acoustic guitar': 90, Amp: 60, 'Drum kit': 200, 'Mic stands': 10 },
  'Indianapolis Fountain Square sale': { Canvases: 8, Shelving: 40, Easels: 25, Stools: 12 },
  'St. Louis Soulard block sale': { 'Cast iron': 20, Crocks: 15, Chairs: 18, Mirrors: 30 },
  'Chicago Logan Square garage sale': { Records: 6, Books: 3, Jackets: 25, Sneakers: 30 },
  'Atlanta Grant Park yard sale': { 'Porch swing': 50, Planters: 6, 'Rocking chairs': 30, Rugs: 20 },
  'Denver Baker neighborhood sale': { Skis: 80, Snowboard: 90, 'Bike parts': 5, Helmets: 15 },
  'Phoenix Coronado garage sale': { 'Swamp cooler': 60, 'Tool sets': 30, 'Patio set': 70, Fans: 10 },
  'Seattle Ballard moving sale': { Desk: 70, 'Kitchen gear': 10, Bookshelf: 35, Lamps: 12 },
  'Minneapolis Northeast tool sale': { Wrenches: 15, Jack: 25, Creeper: 20, 'Oil filters': 2 },
  'Nashville Germantown block sale': { Signs: 20, 'Vintage art': 35, Frames: 8, Trunk: 45 },
  'Car boot sale, Wimbledon': { 'Tea sets': 8, Jumpers: 4, Paperbacks: 1, 'Garden tools': 6 },
  'Car boot sale, Heaton Park': { Toys: 2, DVDs: 1, 'Bedside tables': 10, Prams: 25 },
  'Dublin garage sale, Rathmines': { Armchair: 40, Books: 2, Mirror: 15, Lamp: 8 },
  'Hofflohmarkt Prenzlauer Berg': { Vinyl: 6, Porcelain: 5, 'Kinderbücher': 2, 'Fahrräder': 45 },
  'Vrijmarkt Utrecht': { Kleding: 4, Boeken: 2, Fietsmanden: 10, Speelgoed: 3 },
  'Vide-grenier de la Croix-Rousse': { Vaisselle: 5, Livres: 2, Affiches: 8, Meubles: 30 },
  'El Rastro de Madrid': { Cuadros: 25, 'Cerámica': 10, Discos: 5, Relojes: 20 },
  'Loppis Sodermalm': { Glas: 30, Textilier: 50, 'Böcker': 10, Lampor: 120 },
  'Garage sale, Bondi': { Surfboards: 120, Wetsuits: 30, 'Beach chairs': 10, Bikes: 80 },
  'Garage sale, Ponsonby': { Dresser: 80, Dresses: 10, Records: 8, Plants: 5 },
  'Yard sale, Roncesvalles': { Skates: 15, 'Kids books': 2, Lamps: 10, Strollers: 40 },
  'Garage sale, Quezon City': { Clothes: 150, Bags: 300, Phones: 2500, Fans: 400 },
  'Garage sale, Kilimani Nairobi': { 'Sofa set': 15000, Books: 200, 'Kids clothes': 300, Kettle: 800 },
  'Mitumba day, Isiolo': { Jackets: 600, Shoes: 500, Bags: 400, Blankets: 700 },
  'Garage sale, Lekki Lagos': { TV: 90000, 'Standing fan': 15000, Sofa: 120000, Generator: 150000 },
  'Car boot sale, Constantia Cape Town': { 'Braai set': 250, Bicycles: 900, Toys: 50, Crockery: 120 },
  'Garage sale, Osu Accra': { Fabric: 60, Dresses: 40, Pots: 80, Sandals: 25 },
  'Garage sale, Koramangala': { Books: 100, Laptop: 18000, Bicycle: 3500, Speakers: 1500 },
  'Bazar de garagem, Vila Madalena': { Roupas: 30, Discos: 25, Quadros: 80, Livros: 15 },
  'Venta de garaje, Roma Norte': { Muebles: 800, Libros: 50, 'Cerámica': 120, Lamparas: 200 },
  'Venta de garage, Palermo': { Ropa: 8000, Libros: 3000, Discos: 5000, Plantas: 2000 },
  'Garage sale, Tokyo Setagaya': { Kimono: 3000, Dishes: 300, Vinyl: 800, Books: 100 },
  'Garage sale, Tiong Bahru': { Bookshelf: 40, Books: 3, 'Rice cooker': 15, Fans: 10 },
  'Garage sale, Dubai Marina': { Sofa: 400, TV: 600, 'Kids bike': 60, 'Dining table': 300 },
};

const SEED_LEVEL: Record<string, number> = {
  "Haynie's Corner block sale": 2,
  'Vintage & antiques': 2,
  'Downtown loft clear-out': 2,
  'Darmstadt neighborhood sale': 1,
  'Garage cleanout: tools & fishing': 2,
  'Highlands yard sale': 1,
  'Old Louisville antiques & books': 2,
  'East Nashville block sale': 2,
  'Sylvan Park garage sale': 1,
  'South Austin moving sale': 3,
  'Hyde Park multi-family sale': 1,
  'Alberta Arts estate sale': 3,
  'Sellwood tools & bikes': 1,
};

const RAW_SEED: Array<{
  title: string;
  address: string;
  lat: number;
  lng: number;
  off: number;
  start: string;
  end: string;
  cats: string[];
  desc: string;
  cur?: string;
}> = [
  { title: "Haynie's Corner block sale", address: '412 Parrett St, Evansville, IN', lat: 37.9593, lng: -87.5661, off: 4, start: '08:00', end: '14:00', cats: ['Furniture', 'Household', 'Books'], desc: 'Six houses on one block. Mid-century dressers, kitchenware, a crate of vinyl and plenty of paperbacks. Cash and Venmo.' },
  { title: 'Estate sale: HVAC & shop tools', address: '1180 State St, Newburgh, IN', lat: 37.9497, lng: -87.4051, off: 4, start: '07:00', end: '15:00', cats: ['Tools', 'Antiques'], desc: 'Retired contractor. Pipe wrenches, a stick welder, hand tools and a rolling tool chest. Priced to move by noon.' },
  { title: "Kids' clothes & gear", address: '2230 N Fulton Ave, Evansville, IN', lat: 37.9993, lng: -87.5809, off: 3, start: '09:00', end: '13:00', cats: ['Kids', 'Clothing'], desc: 'Sizes newborn to 6, a stroller, a toddler bed and a bin of wooden toys.' },
  { title: 'Moving sale, everything must go', address: '3015 Lincoln Ave, Evansville, IN', lat: 37.9697, lng: -87.5131, off: 4, start: '08:00', end: '16:00', cats: ['Furniture', 'Electronics', 'Household'], desc: 'Sectional couch, 55-inch TV, standing desk and a fully stocked kitchen.' },
  { title: 'Vintage & antiques', address: '1420 W Franklin St, Evansville, IN', lat: 37.9803, lng: -87.5844, off: 5, start: '10:00', end: '15:00', cats: ['Antiques', 'Books'], desc: 'Depression glass, cast iron, old Evansville memorabilia and a few oak bookcases.' },
  { title: 'Downtown loft clear-out', address: '118 SE 2nd St, Evansville, IN', lat: 37.9694, lng: -87.5723, off: 3, start: '10:00', end: '14:00', cats: ['Furniture', 'Electronics'], desc: 'Desk, monitors, bar stools and a record player. Street parking on Second.' },
  { title: 'Darmstadt neighborhood sale', address: '9801 Darmstadt Rd, Evansville, IN', lat: 38.0512, lng: -87.5769, off: 11, start: '08:00', end: '14:00', cats: ['Household', 'Tools', 'Kids'], desc: 'A dozen driveways. Lawn equipment, bikes, baby gear and holiday decor.' },
  { title: 'Garage cleanout: tools & fishing', address: '2715 Mill Rd, Evansville, IN', lat: 38.0213, lng: -87.5681, off: 11, start: '07:00', end: '12:00', cats: ['Tools', 'Household'], desc: 'Fishing rods, tackle boxes, a bench grinder and power tools. Early birds welcome.' },
  { title: 'Highlands yard sale', address: '1380 Bardstown Rd, Louisville, KY', lat: 38.2378, lng: -85.7107, off: 4, start: '08:00', end: '13:00', cats: ['Clothing', 'Household'], desc: 'Vintage clothes, kitchenware and a few plants.' },
  { title: 'Old Louisville antiques & books', address: '1210 S 4th St, Louisville, KY', lat: 38.229, lng: -85.764, off: 5, start: '09:00', end: '15:00', cats: ['Antiques', 'Books'], desc: 'Estate cleanout: Victorian furniture, framed prints and 300+ books.' },
  { title: 'East Nashville block sale', address: '1008 Woodland St, Nashville, TN', lat: 36.179, lng: -86.747, off: 4, start: '08:00', end: '14:00', cats: ['Furniture', 'Kids', 'Electronics'], desc: 'Five houses, one street. Music gear, kids bikes and mid-century chairs.' },
  { title: 'Sylvan Park garage sale', address: '4902 Utah Ave, Nashville, TN', lat: 36.1444, lng: -86.8439, off: 3, start: '07:30', end: '12:00', cats: ['Tools', 'Household'], desc: 'Workbench, hand tools, camping gear.' },
  { title: 'South Austin moving sale', address: '2210 W Oltorf St, Austin, TX', lat: 30.2411, lng: -97.7574, off: 4, start: '08:00', end: '14:00', cats: ['Furniture', 'Household', 'Electronics'], desc: 'Couch, dining set, TVs and a kayak. Cash or Venmo.' },
  { title: 'Hyde Park multi-family sale', address: '4300 Speedway, Austin, TX', lat: 30.306, lng: -97.728, off: 5, start: '09:00', end: '13:00', cats: ['Kids', 'Clothing', 'Books'], desc: 'Toddler clothes, picture books and baby gear.' },
  { title: 'Alberta Arts estate sale', address: '2815 NE Alberta St, Portland, OR', lat: 45.559, lng: -122.642, off: 4, start: '09:00', end: '16:00', cats: ['Antiques', 'Furniture'], desc: 'Mid-century lamps, ceramics and a teak sideboard.' },
  { title: 'Sellwood tools & bikes', address: '7715 SE 13th Ave, Portland, OR', lat: 45.464, lng: -122.651, off: 11, start: '08:00', end: '13:00', cats: ['Tools', 'Household'], desc: 'Bike frames, hand tools and garden supplies.' },
  { title: 'Newburgh riverside yard sale', address: '7 Jefferson St, Newburgh, IN', lat: 37.9446, lng: -87.4056, off: 3, start: '08:00', end: '14:00', cats: ['Household', 'Garden'], desc: 'Garden pots, patio chairs, a porch swing and boxes of kitchen odds and ends.' },
  { title: 'Pigeon Creek multi-family', address: '1900 Stringtown Rd, Evansville, IN', lat: 37.995, lng: -87.5559, off: 4, start: '07:30', end: '13:00', cats: ['Kids', 'Toys', 'Clothing'], desc: 'Three families clearing out outgrown toys, strollers and winter coats.' },
  { title: 'Henderson attic cleanout', address: '410 2nd St, Henderson, KY', lat: 37.8365, lng: -87.59, off: 5, start: '09:00', end: '15:00', cats: ['Antiques', 'Collectibles'], desc: 'Trunks full of postcards, costume jewelry, old tins and a Victrola.' },
  { title: 'Boonville workshop sale', address: '215 S 2nd St, Boonville, IN', lat: 38.0492, lng: -87.2742, off: 4, start: '07:00', end: '12:00', cats: ['Tools', 'Auto parts'], desc: 'Retired mechanic. Socket sets, jack stands, shop vac and a pile of spare parts.' },
  { title: 'Eastside baby & maternity', address: '1300 E Riverside Dr, Evansville, IN', lat: 37.95, lng: -87.5407, off: 3, start: '09:00', end: '12:00', cats: ['Baby', 'Clothing'], desc: 'Gently used bouncer, swing, carrier and newborn through 12 month outfits.' },
  { title: 'Mt. Vernon vinyl & stereo', address: '520 Main St, Mount Vernon, IN', lat: 37.9334, lng: -87.896, off: 6, start: '10:00', end: '16:00', cats: ['Music', 'Electronics'], desc: 'Three hundred records, a receiver, tower speakers and a turntable.' },
  { title: 'Haubstadt farm auction cleanup', address: '8400 N State Rd 41, Haubstadt, IN', lat: 38.2058, lng: -87.5772, off: 6, start: '08:00', end: '15:00', cats: ['Tools', 'Garden'], desc: 'Chains, post hole digger, garden tiller, feed buckets and hand tools by the box.' },
  { title: 'University Heights dorm clearout', address: '2100 Lincoln Ave, Evansville, IN', lat: 37.97, lng: -87.5267, off: 2, start: '10:00', end: '14:00', cats: ['Furniture', 'Electronics'], desc: 'Mini fridge, futon, desk lamp, microwave and a gaming monitor. Cheap.' },
  { title: 'Cypress Dale craft supplies', address: '3301 Cypress Dale Dr, Evansville, IN', lat: 38.0, lng: -87.621, off: 5, start: '08:30', end: '13:30', cats: ['Crafts', 'Household'], desc: 'Fabric by the yard, yarn, sewing machine, scrapbook paper and frames.' },
  { title: 'Warrick County bikes & sports', address: '402 W Main St, Boonville, IN', lat: 38.048, lng: -87.28, off: 7, start: '08:00', end: '13:00', cats: ['Sports & outdoors', 'Bikes'], desc: 'Road and mountain bikes, helmets, a kayak and a rack of fishing rods.' },
  { title: 'Franklin Street thrift pop-up', address: '1118 W Franklin St, Evansville, IN', lat: 37.9802, lng: -87.5799, off: 3, start: '09:00', end: '15:00', cats: ['Clothing', 'Household'], desc: 'Racks of jeans, jackets and dresses plus glassware and old picture frames.' },
  { title: 'Newburgh holiday decor sale', address: '6055 Bell Rd, Newburgh, IN', lat: 37.9623, lng: -87.4049, off: 9, start: '09:00', end: '14:00', cats: ['Holiday', 'Household'], desc: 'Artificial trees, lights, wreaths, ornaments and a nativity set.' },
  { title: 'Oak Hill bar & kitchen sale', address: '2418 Oak Hill Rd, Evansville, IN', lat: 38.0006, lng: -87.5209, off: 4, start: '08:00', end: '14:00', cats: ['Kitchen', 'Appliances'], desc: 'Stand mixer, air fryer, cast iron set, blender and a full set of dishes.' },
  { title: 'Stockwell Road game night haul', address: '5400 Stockwell Rd, Evansville, IN', lat: 37.9777, lng: -87.5024, off: 6, start: '10:00', end: '15:00', cats: ['Games', 'Toys'], desc: 'Board games, a retro console with 40 cartridges and card game binders.' },
  { title: 'Henderson patio & garden', address: '1800 N Elm St, Henderson, KY', lat: 37.8477, lng: -87.5851, off: 5, start: '08:00', end: '13:00', cats: ['Garden', 'Furniture'], desc: 'Wrought iron table set, fire pit, hose reels and a stack of clay pots.' },
  { title: 'Lloyd Expressway pet supply sale', address: '4801 Lloyd Expy, Evansville, IN', lat: 37.9765, lng: -87.4873, off: 2, start: '09:00', end: '13:00', cats: ['Pets', 'Household'], desc: 'Large crates, dog beds, leashes, cat trees and aquarium tanks.' },
  { title: 'Green River art & decor', address: '1600 Green River Rd, Evansville, IN', lat: 37.9936, lng: -87.4926, off: 8, start: '10:00', end: '16:00', cats: ['Art & decor', 'Furniture'], desc: 'Framed prints, large mirrors, side tables and handmade pottery.' },
  { title: 'Chandler church rummage', address: '305 E Locust St, Chandler, IN', lat: 38.0553, lng: -87.37, off: 10, start: '08:00', end: '14:00', cats: ['Household', 'Books', 'Clothing'], desc: 'Annual rummage sale. Books by the bag, linens, clothes and baked goods table.' },
  { title: 'Diamond Ave jewelry & watches', address: '900 Diamond Ave, Evansville, IN', lat: 38.0013, lng: -87.5756, off: 4, start: '11:00', end: '16:00', cats: ['Jewelry', 'Collectibles'], desc: 'Estate jewelry, wristwatches, coin collection and a cabinet of figurines.' },
  { title: 'West Side garage blowout', address: '1500 W Illinois St, Evansville, IN', lat: 37.9794, lng: -87.5804, off: 3, start: '07:00', end: '13:00', cats: ['Tools', 'Household', 'Auto parts'], desc: 'Power tools, a rolling toolbox, car stereo, floor jack and tires.' },
  { title: 'Princeton garage & grill sale', address: '812 W Broadway St, Princeton, IN', lat: 38.3555, lng: -87.5759, off: 3, start: '08:00', end: '14:00', cats: ['Kitchen', 'Household'], desc: 'Grills, coolers and a full camp kitchen set.' },
  { title: 'Owensboro lakeside cleanout', address: '3320 Frederica St, Owensboro, KY', lat: 37.7412, lng: -87.1175, off: 4, start: '08:00', end: '13:00', cats: ['Sports & outdoors', 'Household'], desc: 'Life jackets, tackle, a canoe and lake house decor.' },
  { title: 'Jasper craftsman furniture sale', address: '1102 Newton St, Jasper, IN', lat: 38.3912, lng: -86.9311, off: 5, start: '09:00', end: '15:00', cats: ['Furniture', 'Antiques'], desc: 'Solid oak pieces and a hand built bookcase.' },
  { title: 'Poseyville church yard sale', address: '110 N Main St, Poseyville, IN', lat: 38.17, lng: -87.7878, off: 6, start: '07:30', end: '13:00', cats: ['Household', 'Books', 'Kids'], desc: 'Fundraiser sale with baked goods and kids books.' },
  { title: 'Rockport river view estate sale', address: '520 3rd St, Rockport, IN', lat: 37.8762, lng: -87.0469, off: 7, start: '09:00', end: '16:00', cats: ['Antiques', 'Collectibles'], desc: 'Three generations of collectibles and old tools.' },
  { title: 'Cannelton hardware closeout', address: '300 Washington St, Cannelton, IN', lat: 37.9111, lng: -86.7436, off: 5, start: '08:00', end: '14:00', cats: ['Tools', 'Auto parts'], desc: 'Small hardware store closing, bins of fasteners and tools.' },
  { title: 'Evansville Garvin Park yard sale', address: '600 Garvin Park Dr, Evansville, IN', lat: 37.9955, lng: -87.5635, off: 3, start: '08:00', end: '13:00', cats: ['Household', 'Furniture'], desc: 'Neighborhood sale with fresh lemonade.' },
  { title: 'Helfrich Park moving sale', address: '1900 Washington Ave, Evansville, IN', lat: 37.9628, lng: -87.5313, off: 4, start: '08:00', end: '15:00', cats: ['Furniture', 'Appliances'], desc: 'Washer, dryer and a bedroom set must go.' },
  { title: 'McCutchanville estate tools', address: '7120 Browning Rd, Evansville, IN', lat: 38.0472, lng: -87.5329, off: 5, start: '07:00', end: '14:00', cats: ['Tools', 'Garden'], desc: 'Mower, trimmers and a full woodworking shop.' },
  { title: 'Newburgh vintage clothing sale', address: '214 W Jennings St, Newburgh, IN', lat: 37.9442, lng: -87.4072, off: 6, start: '10:00', end: '16:00', cats: ['Clothing', 'Collectibles'], desc: 'Seventies dresses, denim jackets and hats.' },
  { title: 'Henderson kids outgrown sale', address: '1021 Second St, Henderson, KY', lat: 37.8399, lng: -87.588, off: 3, start: '08:00', end: '12:00', cats: ['Kids', 'Baby'], desc: 'Outgrown clothes, bikes and ride on toys.' },
  { title: 'Mt. Carmel garden club plant sale', address: '215 E 6th St, Mount Carmel, IL', lat: 38.4126, lng: -87.7605, off: 6, start: '08:00', end: '13:00', cats: ['Garden', 'Household'], desc: 'Perennials, herbs and hand painted pots.' },
  { title: 'Ferdinand quilts & crafts', address: '1210 Main St, Ferdinand, IN', lat: 38.2297, lng: -86.861, off: 7, start: '09:00', end: '15:00', cats: ['Crafts', 'Art & decor'], desc: 'Handmade quilts, yarn and craft supplies.' },
  { title: 'Fort Branch garage music sale', address: '201 E Locust St, Fort Branch, IN', lat: 38.2492, lng: -87.5764, off: 5, start: '10:00', end: '16:00', cats: ['Music', 'Electronics'], desc: 'Guitars, amps and drum gear. Food truck on site.' },
  { title: 'Indianapolis Fountain Square sale', address: '1100 Prospect St, Indianapolis, IN', lat: 39.7499, lng: -86.1451, off: 4, start: '09:00', end: '15:00', cats: ['Art & decor', 'Furniture'], desc: 'Studio clear out with canvases and shelving.' },
  { title: 'St. Louis Soulard block sale', address: '1800 S 9th St, St. Louis, MO', lat: 38.6082, lng: -90.2, off: 5, start: '08:00', end: '14:00', cats: ['Household', 'Antiques'], desc: 'Block wide sale, coffee and pastries all morning.' },
  { title: 'Chicago Logan Square garage sale', address: '2740 N Milwaukee Ave, Chicago, IL', lat: 41.9306, lng: -87.7075, off: 4, start: '09:00', end: '14:00', cats: ['Clothing', 'Books'], desc: 'Records, books and designer thrift.' },
  { title: 'Atlanta Grant Park yard sale', address: '600 Cherokee Ave SE, Atlanta, GA', lat: 33.7398, lng: -84.372, off: 3, start: '08:00', end: '13:00', cats: ['Furniture', 'Garden'], desc: 'Porch furniture, planters and sweet tea.' },
  { title: 'Denver Baker neighborhood sale', address: '210 S Broadway, Denver, CO', lat: 39.7118, lng: -104.9877, off: 5, start: '09:00', end: '15:00', cats: ['Sports & outdoors', 'Bikes'], desc: 'Skis, snowboards and bike parts.' },
  { title: 'Phoenix Coronado garage sale', address: '1215 E Roosevelt St, Phoenix, AZ', lat: 33.4586, lng: -112.0562, off: 4, start: '07:00', end: '11:00', cats: ['Household', 'Tools'], desc: 'Early start before the heat. Cold drinks on hand.' },
  { title: 'Seattle Ballard moving sale', address: '5420 22nd Ave NW, Seattle, WA', lat: 47.6684, lng: -122.3854, off: 6, start: '09:00', end: '15:00', cats: ['Furniture', 'Kitchen'], desc: 'Full apartment, kitchen gear and a nice desk.' },
  { title: 'Minneapolis Northeast tool sale', address: '1600 Central Ave NE, Minneapolis, MN', lat: 45.0027, lng: -93.2474, off: 5, start: '08:00', end: '14:00', cats: ['Tools', 'Auto parts'], desc: 'Garage full of tools and auto parts.' },
  { title: 'Nashville Germantown block sale', address: '1200 5th Ave N, Nashville, TN', lat: 36.1769, lng: -86.7873, off: 6, start: '09:00', end: '14:00', cats: ['Antiques', 'Art & decor'], desc: 'Brick house clear out with signs and vintage art.' },
  { title: 'Car boot sale, Wimbledon', address: 'Wimbledon Stadium Car Park, Plough Ln, London, UK', lat: 51.4284, lng: -0.1882, off: 4, start: '08:00', end: '14:00', cats: ['Household', 'Clothing'], desc: 'A classic British car boot sale. Tea and bacon rolls from the van.', cur: 'GBP' },
  { title: 'Car boot sale, Heaton Park', address: 'Heaton Park, Middleton Rd, Manchester, UK', lat: 53.5201, lng: -2.2484, off: 5, start: '07:00', end: '13:00', cats: ['Household', 'Kids'], desc: 'Early start. Toys, DVDs and furniture.', cur: 'GBP' },
  { title: 'Dublin garage sale, Rathmines', address: '28 Rathmines Rd Lower, Dublin, Ireland', lat: 53.3243, lng: -6.2655, off: 4, start: '10:00', end: '16:00', cats: ['Furniture', 'Books'], desc: 'Moving house. Everything must go, tea on the go.', cur: 'EUR' },
  { title: 'Hofflohmarkt Prenzlauer Berg', address: 'Kollwitzstraße 52, Berlin, Germany', lat: 52.5365, lng: 13.4247, off: 5, start: '11:00', end: '16:00', cats: ['Household', 'Antiques'], desc: 'Hofflohmarkt: courtyards across the neighborhood open their stalls. Kaffee und Kuchen too.', cur: 'EUR' },
  { title: 'Vrijmarkt Utrecht', address: 'Oudegracht 120, Utrecht, Netherlands', lat: 52.0907, lng: 5.1214, off: 6, start: '09:00', end: '17:00', cats: ['Clothing', 'Household'], desc: 'Vrijmarkt: anyone can set up a spot along the canal. Stroopwafels.', cur: 'EUR' },
  { title: 'Vide-grenier de la Croix-Rousse', address: 'Place de la Croix-Rousse, Lyon, France', lat: 45.7745, lng: 4.8315, off: 6, start: '07:00', end: '17:00', cats: ['Antiques', 'Household'], desc: 'Vide-grenier: the whole neighborhood empties its attic. Crepes on site.', cur: 'EUR' },
  { title: 'El Rastro de Madrid', address: 'Ribera de Curtidores, Madrid, Spain', lat: 40.4086, lng: -3.7078, off: 6, start: '09:00', end: '15:00', cats: ['Antiques', 'Art & decor'], desc: 'El Rastro: Sunday flea market with a long street of stalls.', cur: 'EUR' },
  { title: 'Loppis Sodermalm', address: 'Mariatorget 3, Stockholm, Sweden', lat: 59.3169, lng: 18.0632, off: 5, start: '10:00', end: '15:00', cats: ['Household', 'Antiques'], desc: 'Loppis: a second hand sale in the courtyard. Fika included.', cur: 'SEK' },
  { title: 'Garage sale, Bondi', address: '12 Campbell Pde, Bondi Beach, Sydney, Australia', lat: -33.8915, lng: 151.2767, off: 4, start: '07:30', end: '13:00', cats: ['Sports & outdoors', 'Household'], desc: 'Garage sale: surfboards, wetsuits and beach gear. Snags and cold drinks.', cur: 'AUD' },
  { title: 'Garage sale, Ponsonby', address: '88 Ponsonby Rd, Auckland, New Zealand', lat: -36.8582, lng: 174.7447, off: 4, start: '08:00', end: '13:00', cats: ['Furniture', 'Clothing'], desc: 'Garage sale with vintage clothes and a sausage sizzle.', cur: 'NZD' },
  { title: 'Yard sale, Roncesvalles', address: '210 Roncesvalles Ave, Toronto, Canada', lat: 43.6489, lng: -79.4496, off: 5, start: '09:00', end: '15:00', cats: ['Household', 'Kids'], desc: 'Neighborhood yard sale. Timbits and hot coffee.', cur: 'CAD' },
  { title: 'Garage sale, Quezon City', address: '12 Kamias Rd, Quezon City, Philippines', lat: 14.6344, lng: 121.0584, off: 5, start: '08:00', end: '14:00', cats: ['Clothing', 'Electronics'], desc: 'Garage sale: clothes, bags and gadgets. Merienda available.', cur: 'PHP' },
  { title: 'Garage sale, Kilimani Nairobi', address: 'Argwings Kodhek Rd, Kilimani, Nairobi, Kenya', lat: -1.2927, lng: 36.7891, off: 4, start: '09:00', end: '15:00', cats: ['Household', 'Furniture'], desc: 'Garage sale with household goods, books and kids clothes. Pay by M-Pesa. Chai and mandazi.', cur: 'KES' },
  { title: 'Mitumba day, Isiolo', address: 'Isiolo Town Market, Isiolo, Kenya', lat: 0.35, lng: 37.5833, off: 5, start: '08:00', end: '16:00', cats: ['Clothing', 'Shoes'], desc: 'Second hand clothes and shoes. Pay by M-Pesa or cash.', cur: 'KES' },
  { title: 'Garage sale, Lekki Lagos', address: '14 Admiralty Way, Lekki, Lagos, Nigeria', lat: 6.4431, lng: 3.4543, off: 5, start: '09:00', end: '15:00', cats: ['Electronics', 'Furniture'], desc: 'Garage sale: TVs, fans and furniture. Pay by bank transfer.', cur: 'NGN' },
  { title: 'Car boot sale, Constantia Cape Town', address: 'Constantia Rd, Cape Town, South Africa', lat: -34.0156, lng: 18.4509, off: 4, start: '08:00', end: '13:00', cats: ['Household', 'Sports & outdoors'], desc: 'Car boot sale: outdoor gear, braai tools and kids toys.', cur: 'ZAR' },
  { title: 'Garage sale, Osu Accra', address: 'Oxford St, Osu, Accra, Ghana', lat: 5.5625, lng: -0.1817, off: 5, start: '09:00', end: '15:00', cats: ['Clothing', 'Household'], desc: 'Garage sale with fabric, clothes and kitchenware.', cur: 'GHS' },
  { title: 'Garage sale, Koramangala', address: '5th Block, Koramangala, Bengaluru, India', lat: 12.9345, lng: 77.6155, off: 5, start: '10:00', end: '16:00', cats: ['Books', 'Electronics'], desc: 'Garage sale: books, laptops and bicycles. UPI accepted.', cur: 'INR' },
  { title: 'Bazar de garagem, Vila Madalena', address: 'Rua Harmonia 120, São Paulo, Brazil', lat: -23.5558, lng: -46.6911, off: 5, start: '10:00', end: '17:00', cats: ['Clothing', 'Art & decor'], desc: 'Bazar de garagem: roupas, discos e arte. Pix aceito.', cur: 'BRL' },
  { title: 'Venta de garaje, Roma Norte', address: 'Calle Orizaba 90, Roma Norte, Mexico City, Mexico', lat: 19.4156, lng: -99.1627, off: 4, start: '09:00', end: '15:00', cats: ['Furniture', 'Art & decor'], desc: 'Venta de garaje: muebles, libros y artesanías. Café de olla.', cur: 'MXN' },
  { title: 'Venta de garage, Palermo', address: 'Honduras 5200, Palermo, Buenos Aires, Argentina', lat: -34.5885, lng: -58.4305, off: 5, start: '11:00', end: '18:00', cats: ['Clothing', 'Books'], desc: 'Venta de garage: ropa, libros y discos. Mate para todos.', cur: 'ARS' },
  { title: 'Garage sale, Tokyo Setagaya', address: '1-12 Sangenjaya, Setagaya, Tokyo, Japan', lat: 35.6437, lng: 139.6699, off: 6, start: '10:00', end: '16:00', cats: ['Household', 'Clothing'], desc: 'Garage sale (furima): kitchenware, kimono and vinyl. Cash only.', cur: 'JPY' },
  { title: 'Garage sale, Tiong Bahru', address: '56 Eng Hoon St, Tiong Bahru, Singapore', lat: 1.285, lng: 103.832, off: 5, start: '10:00', end: '16:00', cats: ['Household', 'Books'], desc: 'Moving sale: furniture, books and kitchen gear.', cur: 'SGD' },
  { title: 'Garage sale, Dubai Marina', address: 'Marina Walk, Dubai Marina, Dubai, UAE', lat: 25.0805, lng: 55.1403, off: 4, start: '09:00', end: '14:00', cats: ['Furniture', 'Electronics'], desc: 'Expat moving sale: furniture, TVs and kids gear. Cold drinks provided.', cur: 'AED' },
];

const DRINK_INDICES = new Set([2, 7, 13, 22, 29, 42, 50, 55, 59, 60, 62, 68, 69, 70, 74, 80, 82]);
const FOOD_INDICES = new Set([7, 13, 18, 25, 36, 39, 49, 50, 52, 61, 63, 64, 66, 70, 71, 72, 76, 78, 82]);

const inferSeedSaleType = (title: string, desc: string): SaleType => {
  const hay = `${title} ${desc}`.toLowerCase();
  if (hay.includes('car boot')) return 'Car Boot Sale';
  if (
    /flea market|rummage|block sale|block wide|thrift pop-up|hofflohmarkt|vrijmarkt|vide-grenier|el rastro|loppis|mitumba|bazar/.test(
      hay,
    )
  ) {
    return 'Flea Market';
  }
  return 'Garage Sale';
};

const SEED_PHOTO_URLS = {
  garage: '/src/assets/images/garage_sale_driveway_1795014651799.jpg',
  flea: '/src/assets/images/flea_market_stalls_1795014649902.jpg',
  carBoot: '/src/assets/images/car_boot_sale_1795014651456.jpg',
  furniture: '/src/assets/images/furniture_yard_sale_1795014651056.jpg',
  tools: '/src/assets/images/tools_workshop_sale_1795014652409.jpg',
} as const;

const seedPhotosFor = (
  saleType: SaleType,
  cats: string[],
  title: string,
  idx: number,
): string[] => {
  const { garage, flea, carBoot, furniture, tools } = SEED_PHOTO_URLS;
  const hay = `${title} ${cats.join(' ')}`.toLowerCase();

  let primary: string = garage;
  let rest: string[] = [furniture, tools, flea];

  if (saleType === 'Car Boot Sale') {
    primary = carBoot;
    rest = [garage, flea, furniture];
  } else if (saleType === 'Flea Market') {
    primary = flea;
    rest = [garage, furniture, carBoot];
  } else if (/tool|workshop|auto|music|vinyl|stereo|guitar|camera|mower/.test(hay)) {
    primary = tools;
    rest = [garage, furniture, carBoot];
  } else if (/furniture|sofa|couch|dresser|garden|patio|plant|art & decor|yard sale/.test(hay)) {
    primary = furniture;
    rest = [garage, flea, tools];
  } else if (/clothing|vintage|antique|collectible|jewelry|craft/.test(hay)) {
    primary = idx % 2 === 0 ? garage : flea;
    rest = [idx % 2 === 0 ? flea : garage, furniture, tools];
  } else {
    primary = idx % 3 === 0 ? furniture : garage;
    rest = [idx % 3 === 0 ? garage : furniture, tools, carBoot];
  }

  const count = (idx % 2) + 2; // 2 or 3 photos per seed listing for swipe testing
  return [primary, ...rest.slice(0, count - 1)];
};

export const SEED: Sale[] = RAW_SEED.map((s, i) => {
  const saleType = inferSeedSaleType(s.title, s.desc);
  return {
    id: `s${i + 1}`,
    title: s.title,
    address: s.address,
    lat: s.lat,
    lng: s.lng,
    date: iso(addDays(TODAY, s.off)),
    start: s.start,
    end: s.end,
    saleType,
    cats: s.cats,
    items: SEED_ITEMS[s.title] || [],
    prices: SEED_PRICES[s.title] || {},
    cur: s.cur || 'USD',
    level: SEED_LEVEL[s.title] || 0,
    pay: SEED_PAY[s.title] || ['cash', 'venmo'],
    desc: s.desc,
    food: FOOD_INDICES.has(i),
    drinks: DRINK_INDICES.has(i),
    photos: seedPhotosFor(saleType, s.cats, s.title, i),
    isSeed: true,
  };
});

const strs = (v: unknown, max = 60): string[] =>
  Array.isArray(v) ? v.filter((t): t is string => typeof t === 'string').slice(0, max) : [];

export function fromDoc(id: string, x: unknown, uid: string | null): Sale | null {
  if (!x || typeof x !== 'object') return null;
  const raw = x as Record<string, unknown>;
  const lat = Number(raw.lat);
  const lng = Number(raw.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return null;
  }
  if (
    typeof raw.title !== 'string' ||
    !raw.title.trim() ||
    !/^\d{4}-\d{2}-\d{2}$/.test(String(raw.date || ''))
  ) {
    return null;
  }
  const prices: Record<string, number> = {};
  if (raw.prices && typeof raw.prices === 'object') {
    const pObj = raw.prices as Record<string, unknown>;
    for (const k of Object.keys(pObj)) {
      const cleanKey = k.trim().slice(0, 80);
      const n = Number(pObj[k]);
      if (cleanKey && Number.isFinite(n) && n >= 0) {
        prices[cleanKey] = n;
        if (Object.keys(prices).length >= 30) break;
      }
    }
  }
  const lvl = Number(raw.level);
  const owner = typeof raw.ownerUid === 'string' ? raw.ownerUid : typeof raw.owner === 'string' ? raw.owner : '';
  const hhmm = (v: unknown, fallback: string) =>
    typeof v === 'string' && /^\d{2}:\d{2}$/.test(v) ? v : fallback;
  return {
    id,
    title: raw.title.trim().slice(0, 120) || 'Yard sale',
    address: typeof raw.address === 'string' ? raw.address.trim().slice(0, 200) : '',
    lat,
    lng,
    date: String(raw.date),
    start: hhmm(raw.start, '08:00'),
    end: hhmm(raw.end, '14:00'),
    saleType: saleTypeOf(raw.saleType),
    cats: strs(raw.cats, 40).length ? strs(raw.cats, 40) : ['Household'],
    items: strs(raw.items, 30),
    prices,
    level: Number.isFinite(lvl) && lvl >= 0 && lvl <= 3 ? lvl : 0,
    cur: typeof raw.cur === 'string' && CURRENCIES[raw.cur] ? raw.cur : 'USD',
    food: raw.food === true,
    drinks: raw.drinks === true || raw.lemonade === true,
    pay: strs(raw.pay, 15),
    desc: typeof raw.desc === 'string' ? raw.desc.slice(0, 2000) : '',
    photos: Array.isArray(raw.photos)
      ? raw.photos
          .filter(
            (v): v is string =>
              typeof v === 'string' && (v.startsWith('data:image/') || v.startsWith('https://')),
          )
          .slice(0, 4)
      : [],
    owner,
    ownerId: uid && owner === uid ? 'me' : owner || 'cloud',
  };
}
