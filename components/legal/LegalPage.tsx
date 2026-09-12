import Link from 'next/link';

/**
 * The two legal pages, shared by the master site and every brand domain.
 *
 * Everything here describes what this application actually does. Nothing is
 * boilerplate: if a sentence says we send something to a supplier, the code
 * sends it to a supplier. Keep it that way — a privacy notice that drifts
 * from the system it describes is worse than none.
 */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-line pt-6">
      <h2 className="font-serif text-2xl text-ink">{title}</h2>
      <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-ink-soft">{children}</div>
    </section>
  );
}

function Shell({
  eyebrow,
  title,
  standfirst,
  children,
}: {
  eyebrow: string;
  title: string;
  standfirst: string;
  children: React.ReactNode;
}) {
  return (
    <div className="container-site max-w-3xl py-14">
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-ink-soft">{eyebrow}</p>
      <h1 className="mt-2 font-serif text-4xl leading-tight text-ink sm:text-5xl">{title}</h1>
      <p className="mt-4 text-[17px] leading-relaxed text-ink-soft">{standfirst}</p>
      <div className="mt-10 space-y-8">{children}</div>
      <p className="mt-12 border-t border-line pt-6 text-sm text-ink-soft">
        Premium Choice Travel JLT, Jumeirah Lakes Towers, Dubai, United Arab Emirates.{' '}
        <a href="tel:+97144206965" className="font-semibold text-teal-deep">
          +971 4 420 6965
        </a>{' '}
        ·{' '}
        <a href="mailto:info@premiumchoicetravel.com" className="font-semibold text-teal-deep">
          info@premiumchoicetravel.com
        </a>
      </p>
    </div>
  );
}

export function BookingTerms() {
  return (
    <Shell
      eyebrow="Booking terms"
      title="How booking with us works"
      standfirst="These terms cover what happens when you send a request through this website, what the price means, and who confirms what. They are written plainly because they describe real steps, not a process nobody follows."
    >
      <Section title="A request is not a booking">
        <p>
          Sending a request tells us what you want. It does not book a room, hold a room, or oblige
          you to anything. No payment is taken on this website, and there is no card form anywhere
          on it.
        </p>
        <p>
          A stay is booked only when a Premium Choice specialist confirms it with the hotel and
          sends you a confirmation and a voucher. Until you have that voucher, nothing is reserved
          in your name.
        </p>
      </Section>

      <Section title="Prices">
        <p>
          Prices shown for specific dates come live from our hotel partners and can change or sell
          out at any time, including between the moment you send a request and the moment we reply.
          If the price has moved, we tell you before anything is confirmed, and you decide.
        </p>
        <p>
          Where we cannot show a live price, we show a guide band instead and label it as one. A
          guide band is an indication of what the hotel usually costs, not a quote.
        </p>
        <p>
          Totals are for the whole stay, for the party you entered, in the currency shown. Charges
          the hotel collects on arrival — tourism fees, municipality fees, deposits — are listed
          separately where the supplier tells us about them, because they are not part of what you
          pay us.
        </p>
      </Section>

      <Section title="Children">
        <p>
          Hotels price children by age, and some rates do not accept them at all. We ask for each
          child's age at check-in and never estimate one. An age given wrongly can invalidate the
          price and, occasionally, the booking itself.
        </p>
      </Section>

      <Section title="Rooms">
        <p>
          This website confirms one room at a time. If you need more than one, send the request
          anyway and a specialist will price the additional rooms with you, because multi-room rates
          are frequently different from one room multiplied.
        </p>
      </Section>

      <Section title="Cancellation and changes">
        <p>
          Cancellation terms belong to the hotel and the rate you choose, not to us. They are shown
          on the room before you request it, repeated on your request, and printed on your voucher.
          A rate marked non-refundable is exactly that.
        </p>
        <p>
          To change or cancel a confirmed booking, contact us and we will tell you what it costs
          before anything is done. Where a charge applies, it is the charge the hotel or supplier
          reports to us.
        </p>
      </Section>

      <Section title="What we book on your behalf">
        <p>
          We act as an agent. The stay itself is provided by the hotel, and their own terms of stay
          apply while you are there. Your voucher names the supplier the booking was made through
          and carries the reference the hotel will recognise.
        </p>
        <p>
          Travel insurance is not included and is not sold on this website. We strongly recommend
          you hold it.
        </p>
      </Section>

      <Section title="Getting hold of us">
        <p>
          A specialist in Dubai answers every request personally, usually the same working day. If
          something is wrong with a booking, call us rather than waiting — a problem is nearly
          always cheaper to fix before you travel.
        </p>
        <p>
          How we handle the information you send is set out in our{' '}
          <Link href="/privacy" className="font-semibold text-teal-deep">
            privacy notice
          </Link>
          .
        </p>
      </Section>
    </Shell>
  );
}

export function PrivacyNotice() {
  return (
    <Shell
      eyebrow="Privacy notice"
      title="What we do with your information"
      standfirst="This describes what this website actually collects, where it goes, and how to get it back or have it removed. It is deliberately specific rather than general."
    >
      <Section title="What we collect when you send a request">
        <p>
          Your name, email address and mobile number. The stay you asked about: the hotel, your
          dates, how many adults and children, each child's age at check-in, the room and rate you
          chose, and anything you typed into the notes.
        </p>
        <p>
          We also record that you accepted these terms, and whether you asked to receive offers by
          email.
        </p>
      </Section>

      <Section title="If you have an account">
        <p>
          Signing in is by a link sent to your email address. We store that address, and any
          travellers you choose to save — their names as printed in the passport, and where you add
          them, nationality, date of birth, passport number and expiry.
        </p>
        <p>
          You add those because they save you repeating them. You can edit or delete any of them at
          any time from your account, and deleting one removes it from our database.
        </p>
      </Section>

      <Section title="Who else sees it">
        <p>
          <strong className="text-ink">Our team.</strong> A request is emailed to our specialists in
          Dubai so a person can act on it.
        </p>
        <p>
          <strong className="text-ink">The hotel, and the supplier we book through.</strong> When
          you ask us to confirm a stay, the lead guest's name, the names of the people in the room
          and any children's ages are sent to the hotel or to the wholesale supplier the rate comes
          from. A hotel cannot check you in otherwise.
        </p>
        <p>
          <strong className="text-ink">The companies that run our systems.</strong> Our database and
          file storage are hosted with Supabase, our email is sent through Resend, and the website
          runs on Vercel. They process this information on our instructions and for no purpose of
          their own.
        </p>
        <p>We do not sell your information, and we do not share it for anyone else's advertising.</p>
      </Section>

      <Section title="Payment details">
        <p>
          We never take card details on this website. When a payment is due, it is taken on a
          payment provider's own secure page, and the card number never reaches our servers or our
          database. We see that a payment succeeded and the provider's reference for it, nothing
          more.
        </p>
      </Section>

      <Section title="Offers by email">
        <p>
          You only receive offers if you tick the box asking for them. It is separate from accepting
          these terms on purpose: you can send a booking request without ever agreeing to marketing,
          and refusing changes nothing about the service you get.
        </p>
        <p>
          To stop, use the unsubscribe link on any offers email or tell us at
          info@premiumchoicetravel.com and we will remove you.
        </p>
      </Section>

      <Section title="What the website stores in your browser">
        <p>
          A sign-in cookie if you have an account, which is what keeps you signed in. Your saved
          hotels and the enquiries you sent before signing in are kept in your own browser's storage
          rather than on our servers, which is why they follow the device rather than the person
          until you sign in.
        </p>
      </Section>

      <Section title="How long we keep it">
        <p>
          Booking requests and confirmed bookings are kept as business records, because we may need
          them years later for a dispute, a refund or a tax audit. Everything else we remove when it
          stops being useful or when you ask.
        </p>
      </Section>

      <Section title="Your rights">
        <p>
          Ask us for a copy of what we hold about you, ask us to correct it, or ask us to delete it.
          Email info@premiumchoicetravel.com or call +971 4 420 6965 and a person will deal with it.
        </p>
        <p>
          Deleting information attached to a confirmed booking may mean we can no longer support
          that booking, and we will say so before acting rather than after.
        </p>
      </Section>
    </Shell>
  );
}
