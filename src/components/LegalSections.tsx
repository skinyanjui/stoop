import type { LegalPageId } from './LegalDialog';

export function TermsSection({
  onChangePage,
}: {
  onChangePage: (p: LegalPageId) => void;
}) {
  return (
    <div className="legal-prose">
      <p className="legal-updated">Effective: November 2026</p>
      <p>
        Welcome to Stoop. These Terms &amp; Conditions govern your access to and use
        of Stoop when browsing local sale maps, saving listings, signing in, or
        publishing a garage sale, flea market, or car boot sale. By accessing Stoop
        or checking the Terms acceptance box, you agree to be bound by these terms.
      </p>

      <h3>1. Platform Role &amp; Offline Venue Disclaimer</h3>
      <p>
        Stoop operates solely as a local discovery directory connecting neighbors and
        shoppers with nearby garage sales, flea markets, and car boot sales. Stoop
        does not own, inspect, appraise, store, or sell any listed goods, does not
        vet users or physical properties, and is not a party to any buyer-seller
        interaction or transaction.
      </p>

      <h3>2. Eligibility &amp; Accounts</h3>
      <p>
        You must be at least 18 years old (or have permission and supervision from a
        parent or legal guardian) to create an account or post a sale on Stoop. When
        signing in with Google, you are responsible for keeping your credentials
        secure and for all listings published under your account.
      </p>

      <h3>3. Seller Responsibilities, Permits &amp; Accuracy</h3>
      <p>If you publish a listing, you represent and warrant that:</p>
      <ul>
        <li>
          Your sale name, sale type (Garage Sale, Flea Market, or Car Boot Sale),
          date, opening/closing hours, full street address, and map pin are truthful
          and accurate.
        </li>
        <li>
          You are the property owner, authorized host, or approved market organizer
          with legal permission to conduct a sale at the posted location.
        </li>
        <li>
          Your event complies with applicable municipal ordinances, garage sale
          permit limits, curb signage rules, and HOA or venue guidelines.
        </li>
        <li>
          You will promptly update or delete your listing if dates, hours, or address
          details change or if the sale is canceled early.
        </li>
      </ul>

      <h3>4. Prohibited Items &amp; Restricted Content</h3>
      <p>
        You may not advertise or offer any unlawful, unsafe, or restricted items in
        a Stoop listing, title, description, or photo (see our{' '}
        <button
          type="button"
          className="link"
          onClick={() => onChangePage('prohibited')}
        >
          Prohibited Items Policy
        </button>
        ), including:
      </p>
      <ul>
        <li>
          Stolen property, counterfeit or pirated goods, or items with altered or
          missing serial numbers.
        </li>
        <li>
          Product-recalled or unsafe consumer goods (such as recalled cribs, expired
          car seats, helmets, or lead-painted toys) prohibited from resale by law.
        </li>
        <li>
          Firearms, ammunition, explosives, fireworks, weapons, or tactical gear.
        </li>
        <li>
          Controlled substances, prescription or over-the-counter medications,
          drug paraphernalia, alcohol, tobacco, or vaping products.
        </li>
        <li>
          Open/used cosmetics, hazardous chemicals, live animals, adult materials,
          or misleading commercial spam and multi-level marketing solicitations.
        </li>
      </ul>

      <h3>5. User Content License &amp; Automatic Expiration</h3>
      <p>
        You retain ownership of the photos, item lists, and descriptions you upload.
        By posting them, you confirm you hold all necessary rights to publish the
        media (including avoiding recognizable third-party faces or private license
        plates) and grant Stoop a limited, non-exclusive, worldwide, royalty-free
        license to host, resize, cache, and display that content on the map and feed.
        Past-dated sales automatically expire from active discovery once their event
        date passes.
      </p>

      <h3>6. Copyright &amp; DMCA Notice and Takedown</h3>
      <p>
        Stoop respects intellectual property rights and removes infringing photos or
        text upon proper notice under the Digital Millennium Copyright Act (DMCA).
        If you believe your copyrighted work was posted without authorization,
        submit a written notice with (a) identification of the copyrighted work, (b)
        the specific listing title, address, or link on Stoop, (c) your contact
        details, and (d) a good-faith statement of unauthorized use via our{' '}
        <button
          type="button"
          className="link"
          onClick={() => onChangePage('contact')}
        >
          Contact page
        </button>{' '}
        or <a href="mailto:legal@stoopsales.com">legal@stoopsales.com</a>. We also
        process valid counter-notices and terminate repeat-infringer accounts where
        appropriate.
      </p>

      <h3>7. Direct In-Person Payments &amp; Sponsored Offers</h3>
      <p>
        All purchases and payments (such as cash, card, Venmo, Cash App, Zelle,
        PayPal, or Apple Pay) take place directly in person between buyers and
        sellers. Stoop does not process merchandise payments, hold escrow, or
        guarantee item condition, authenticity, or refunds. Promotional cards labeled
        &ldquo;Sponsored&rdquo; come from local business partners and are redeemed
        directly with those merchants under their own terms.
      </p>

      <h3>8. Acceptable Use &amp; Anti-Scraping</h3>
      <p>
        You agree not to use bots, crawlers, or automated scripts to scrape, harvest,
        or republish user addresses, coordinates, or photos from Stoop, nor to submit
        fraudulent listings, spoof locations, interfere with map services, or harass
        other community members.
      </p>

      <h3>9. Limitation of Liability &amp; Indemnification</h3>
      <p>
        Stoop is provided on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo;
        basis without warranties of any kind. Shoppers visit private driveways,
        yards, and public market lots at their own discretion and risk. To the
        fullest extent permitted by law, Stoop disclaims liability for inaccurate or
        canceled listings, defective or recalled merchandise, property damage,
        personal injury, or disputes between users. You agree to indemnify and hold
        Stoop harmless from any claims arising from your listings, your sale
        premises, or your violation of these Terms.
      </p>

      <h3>10. Disputes, Severability &amp; Updates</h3>
      <p>
        Before filing any formal claim, you agree to contact us first to seek an
        informal resolution. Except where prohibited by applicable consumer law,
        disputes are brought solely in an individual capacity (not as a class
        action) and may be resolved in small-claims court or under applicable local
        governing law. If any provision of these Terms is held invalid or
        unenforceable, that provision is severed without affecting the remaining
        Terms. We may update these Terms &amp; Conditions periodically and review
        them alongside our{' '}
        <button
          type="button"
          className="link"
          onClick={() => onChangePage('privacy')}
        >
          Privacy Policy
        </button>
        ; continued use constitutes acceptance of updated terms.
      </p>
    </div>
  );
}

export function PrivacySection({
  onChangePage,
}: {
  onChangePage: (p: LegalPageId) => void;
}) {
  return (
    <div className="legal-prose">
      <p className="legal-updated">Effective: November 2026</p>
      <p>
        Stoop (&ldquo;we,&rdquo; &ldquo;our,&rdquo; or &ldquo;us&rdquo;) respects your
        privacy. This Privacy Policy describes what information we collect, how
        location and browser storage work, which third-party services power the map
        and accounts, and what choices you control.
      </p>

      <h3>1. Information You Provide</h3>
      <ul>
        <li>
          <strong>Account Profile:</strong> When you sign in with Google, we receive
          and store your display name, email address, profile photo URL, saved sale
          IDs, and preferred accepted payment methods.
        </li>
        <li>
          <strong>Sale Listings:</strong> When you post a garage sale, flea market,
          or car boot sale, we collect the sale title, sale type, date, hours, full
          street address, map coordinates, categories, item highlights, payment
          options, and any photos you upload.
        </li>
        <li>
          <strong>Support &amp; Legal Inquiries:</strong> If you contact us via email
          or the Contact form, we collect your name, email address, topic, and
          message contents to investigate reports and respond.
        </li>
      </ul>

      <h3>2. Location, Maps &amp; Geocoding Providers</h3>
      <ul>
        <li>
          <strong>Search Inputs &amp; Device Geolocation:</strong> When you search a
          city, ZIP code, or tap &ldquo;Use my location,&rdquo; coordinates are read
          in your browser solely on demand to center the map, reverse-geocode a
          draft address, or estimate distance to nearby sales. We do not collect
          background GPS tracking or retain your live location on our servers.
        </li>
        <li>
          <strong>Third-Party Map &amp; Geocoding Services:</strong> Interactive map
          tiles are fetched from OpenStreetMap contributors, and address search or
          pin reverse-geocoding requests query OpenStreetMap / Nominatim services,
          which receive standard technical request metadata (such as IP address and
          search bounds) under their respective privacy policies.
        </li>
      </ul>

      <h3>3. Browser Local Storage &amp; No Ad Trackers</h3>
      <p>
        Stoop does not run third-party behavioral advertising networks or cross-site
        tracking pixels. Instead, we use minimal browser local storage on your device
        solely for essential functionality:
      </p>
      <ul>
        <li>
          <strong>Saved Favorites:</strong> Remembers starred sales when browsing
          signed out.
        </li>
        <li>
          <strong>Terms Acceptance:</strong> Records whether you accepted our Terms
          &amp; Conditions banner/prompt.
        </li>
        <li>
          <strong>Recent Searches:</strong> Stores up to six recent item, category,
          or place queries (with cached map bounds) for quick re-navigation, which you
          can clear individually or all at once inside the search bar.
        </li>
      </ul>

      <h3>4. Public Visibility, Infrastructure &amp; No Sale of Data</h3>
      <p>
        Published listings—including your full street address, map pin, hours, item
        tags, and photos—are publicly visible to shoppers browsing Stoop until you
        delete them or the sale date passes. Account sign-in and live listing storage
        are hosted on Google Firebase Authentication and Cloud Firestore with TLS
        encryption in transit and rule-based access controls. Local promotions
        labeled &ldquo;Sponsored&rdquo; are served directly without sharing your
        identity with advertisers. We do not sell, rent, or lease your personal
        information to data brokers or marketers, and we disclose information only
        when required by law or to prevent fraud or imminent safety harm.
      </p>

      <h3>5. Data Retention &amp; Privacy Rights</h3>
      <ul>
        <li>
          <strong>Edit or Delete Active Listings:</strong> Signed-in sellers can
          edit or permanently delete their listings anytime from the Profile dialog.
        </li>
        <li>
          <strong>Access, Correction &amp; Deletion Requests:</strong> Regardless of
          where you live, you may request access to, correction of, export of, or
          permanent deletion of your account profile via our{' '}
          <button
            type="button"
            className="link"
            onClick={() => onChangePage('contact')}
          >
            Contact page
          </button>{' '}
          or <a href="mailto:legal@stoopsales.com">legal@stoopsales.com</a>.
        </li>
        <li>
          <strong>Clear Browser Data:</strong> You can clear local favorites, terms
          consent, and recent searches anytime via the search bar &ldquo;Clear&rdquo;
          control or your browser settings.
        </li>
      </ul>

      <h3>6. Children&rsquo;s Privacy &amp; Policy Updates</h3>
      <p>
        Stoop is intended for audiences aged 18 and older (or minors under direct
        adult supervision) and is not directed to children under 13. We do not
        knowingly collect personal information from children under 13. We may update
        this Privacy Policy periodically and will update the effective date above
        whenever material changes take effect.
      </p>
    </div>
  );
}

export function ProhibitedSection() {
  return (
    <div className="legal-prose">
      <p className="legal-updated">Listing Compliance Policy</p>
      <p>
        Even casual driveway garage sales, flea market booths, and car boot sales
        are governed by consumer safety and local resale laws. The items and listing
        practices below are strictly prohibited on Stoop and may be removed without
        notice.
      </p>

      <h3>1. Recalled Products &amp; Unsafe Children&rsquo;s / Safety Gear</h3>
      <ul>
        <li>
          Consumer products subject to a government safety recall (such as CPSC
          recalls), including drop-side cribs, inclined infant sleepers, recalled
          strollers, high chairs, and toys recalled for lead paint or choking risks.
        </li>
        <li>
          Expired, damaged, or previously crash-involved child car seats, booster
          seats, bicycle helmets, and protective sports helmets.
        </li>
      </ul>

      <h3>2. Chipped Cookware, Open Cosmetics &amp; Personal Care</h3>
      <ul>
        <li>
          Chipped or cracked vintage glazed pottery/cookware marketed for food use
          (due to potential lead leaching; label clearly as decorative-only if sold).
        </li>
        <li>
          Opened, tested, or used cosmetics, skincare products, fragrances, razors,
          and personal hygiene items.
        </li>
      </ul>

      <h3>3. Weapons, Firearms &amp; Explosives</h3>
      <ul>
        <li>
          Firearms, receivers, ammunition, gunpowder, black powder, and firearm
          silencers or tactical accessories restricted by law.
        </li>
        <li>
          Explosives, fireworks, incendiary devices, switchblades, brass knuckles,
          and restricted self-defense sprays.
        </li>
      </ul>

      <h3>4. Controlled Substances, Alcohol &amp; Healthcare</h3>
      <ul>
        <li>
          Illegal drugs, unlicensed cannabis products, synthetic substances, and
          drug paraphernalia.
        </li>
        <li>
          Prescription medications, expired over-the-counter medicines, needles,
          syringes, and used regulated medical devices (such as CPAP machines or
          breast pumps).
        </li>
        <li>
          Alcohol, homemade spirits, tobacco, cigarettes, e-cigarettes, and vaping
          liquids, as well as unpermitted perishable food where restricted by local
          health ordinances.
        </li>
      </ul>

      <h3>5. Stolen, Counterfeit &amp; Regulated Goods</h3>
      <ul>
        <li>
          Stolen merchandise or goods with defaced, removed, or altered serial
          numbers.
        </li>
        <li>
          Counterfeit designer bags, watches, apparel, or pirated digital media and
          software.
        </li>
        <li>
          Government assistance benefits, SNAP/EBT cards, or WIC vouchers.
        </li>
      </ul>

      <h3>6. Animals, Hazardous Materials, Adult Content &amp; Spam</h3>
      <ul>
        <li>
          Live animals, pets, livestock, or protected wildlife products.
        </li>
        <li>
          Flammable fuels, solvents, unlabeled chemicals, asbestos, pesticides, and
          damaged or leaking batteries.
        </li>
        <li>
          Pornography, explicit adult materials, fake placeholder pins, multi-level
          marketing promotions, commercial storefront ads disguised as yard sales,
          or keyword stuffing.
        </li>
      </ul>
    </div>
  );
}

export function GuidelinesSection({
  onChangePage,
}: {
  onChangePage: (p: LegalPageId) => void;
}) {
  return (
    <div className="legal-prose">
      <p className="legal-updated">Community &amp; Safety Standards</p>
      <p>
        Stoop connects neighbors in real life across residential garage sales,
        community flea markets, and weekend car boot sales. Follow these proven
        safety and etiquette practices when hosting or shopping.
      </p>

      <h3>Host Home Security &amp; Cash Safety</h3>
      <ul>
        <li>
          <strong>Lock Interior Doors:</strong> Lock all house doors and ground-floor
          windows before opening, close off interior garage access doors, and do not
          allow strangers inside your home to use the restroom or look around.
        </li>
        <li>
          <strong>Don&rsquo;t Host Alone:</strong> Enlist a friend, partner, or
          neighbor to help watch merchandise—distraction scams often target solo
          hosts.
        </li>
        <li>
          <strong>Keep Cash on Your Person:</strong> Use a zippered apron, fanny
          pack, or belt pouch instead of an unattended cash box, and take larger
          bills inside periodically.
        </li>
        <li>
          <strong>Protect Kids &amp; Pets:</strong> Keep pets and young children
          safely indoors away from open driveways, street traffic, and crowds.
        </li>
        <li>
          <strong>Clear Yard Hazards:</strong> Walk your driveway and lawn before
          shoppers arrive to remove tripping hazards, loose cords, or blocked steps.
        </li>
      </ul>

      <h3>Hosting Etiquette &amp; Permits</h3>
      <ul>
        <li>
          <strong>Verify Address &amp; Pin:</strong> Double-check your full street
          address, sale type, date, and hours before publishing.
        </li>
        <li>
          <strong>Permits &amp; Street Signs:</strong> Check municipal yard-sale
          permit limits and HOA rules, and take down cardboard directional signs
          promptly once your sale wraps up.
        </li>
        <li>
          <strong>Update or Remove Early:</strong> Delete your listing from your
          Profile right away if rain or an early sellout closes your event.
        </li>
        <li>
          <strong>Check Prohibited Goods:</strong> Review our{' '}
          <button
            type="button"
            className="link"
            onClick={() => onChangePage('prohibited')}
          >
            Prohibited Items Policy
          </button>{' '}
          before pricing baby gear, vintage dishware, or tools.
        </li>
      </ul>

      <h3>For Shoppers &amp; Visitors</h3>
      <ul>
        <li>
          <strong>Honor Posted Hours:</strong> Avoid knocking on doors or entering
          driveways before opening hours unless early birds are invited.
        </li>
        <li>
          <strong>Park Courteously:</strong> Never block neighbors&rsquo; driveways,
          mailboxes, fire hydrants, or narrow streets.
        </li>
        <li>
          <strong>Inspect &amp; Test First:</strong> Inspect goods and test plugs or
          batteries on site; yard sales and car boot purchases are generally final
          and &ldquo;as is.&rdquo;
        </li>
        <li>
          <strong>Verify Digital Transfers:</strong> When paying with Venmo, Cash
          App, Zelle, or PayPal, confirm the recipient handle in person and wait for
          in-app confirmation before leaving.
        </li>
      </ul>

      <h3>Reporting Concerns</h3>
      <p>
        Spot an inaccurate pin, misleading event, or prohibited item? Let our team
        know via the{' '}
        <button
          type="button"
          className="link"
          onClick={() => onChangePage('contact')}
        >
          Contact page
        </button>{' '}
        with the sale title and street address.
      </p>
    </div>
  );
}
