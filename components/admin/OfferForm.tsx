'use client';

import { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { deleteOffer, saveOffer, type OfferActionState } from '@/lib/admin/offer-actions';
import { ImageField } from '@/components/admin/ImageField';
import { OFFER_BRANDS, OFFER_BRAND_LABELS, type Offer, type OfferBrand } from '@/lib/offers-shared';

function SaveButton({ isNew }: { isNew: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary !px-5 !py-2.5 disabled:opacity-60">
      {pending ? 'Saving…' : isNew ? 'Add offer' : 'Save offer'}
    </button>
  );
}

/**
 * One offer, edited in place. `lockBrand` pins the brand when the form is
 * opened from a brand's own workspace.
 */
export default function OfferForm({ offer, lockBrand }: { offer: Offer | null; lockBrand?: OfferBrand }) {
  const [state, formAction] = useFormState<OfferActionState, FormData>(saveOffer, null);
  const [image, setImage] = useState(offer?.image ?? '');

  return (
    <form action={formAction} className="space-y-5">
      {offer && <input type="hidden" name="id" value={offer.id} />}
      <input type="hidden" name="image" value={image} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="field-label">Title *</label>
          <input name="title" required defaultValue={offer?.title} className="field" placeholder="e.g. Maldives in May — 5 nights, half board" />
        </div>
        <div className="sm:col-span-2">
          <label className="field-label">Subtitle</label>
          <input name="subtitle" defaultValue={offer?.subtitle ?? ''} className="field" placeholder="e.g. Overwater villa, seaplane transfers included" />
        </div>
        <div>
          <label className="field-label">Brand</label>
          {lockBrand ? (
            <>
              <input type="hidden" name="brand" value={lockBrand} />
              <p className="field bg-sand">{OFFER_BRAND_LABELS[lockBrand]}</p>
            </>
          ) : (
            <select name="brand" className="field" defaultValue={offer?.brand ?? 'all'}>
              {OFFER_BRANDS.map((b) => (
                <option key={b} value={b}>{OFFER_BRAND_LABELS[b]}</option>
              ))}
            </select>
          )}
        </div>
        <div>
          <label className="field-label">Badge</label>
          <input name="badge" defaultValue={offer?.badge ?? ''} className="field" placeholder="e.g. Save 20% · Early booking · Free upgrade" />
        </div>
      </div>

      <div>
        <label className="field-label">The offer, in a few lines</label>
        <textarea name="description" rows={4} defaultValue={offer?.description ?? ''} className="field" placeholder="What is included, who it suits, anything to know." />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="field-label">Price from</label>
          <input name="price_from" defaultValue={offer?.priceFrom ?? ''} className="field" placeholder="e.g. 4950" inputMode="decimal" />
        </div>
        <div>
          <label className="field-label">Currency</label>
          <input name="currency" defaultValue={offer?.currency ?? 'AED'} className="field" maxLength={3} />
        </div>
        <div>
          <label className="field-label">Price note</label>
          <input name="price_note" defaultValue={offer?.priceNote ?? ''} className="field" placeholder="e.g. per person, based on two sharing" />
        </div>
        <div>
          <label className="field-label">Valid from</label>
          <input name="valid_from" type="date" defaultValue={offer?.validFrom ?? ''} className="field" />
        </div>
        <div>
          <label className="field-label">Valid until</label>
          <input name="valid_until" type="date" defaultValue={offer?.validUntil ?? ''} className="field" />
        </div>
        <div>
          <label className="field-label">Order</label>
          <input name="sort_order" type="number" defaultValue={offer?.sortOrder ?? 0} className="field" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="field-label">Button text</label>
          <input name="cta_label" defaultValue={offer?.ctaLabel ?? ''} className="field" placeholder="Defaults to “Enquire about this offer”" />
        </div>
        <div>
          <label className="field-label">Button link</label>
          <input name="cta_href" defaultValue={offer?.ctaHref ?? ''} className="field" placeholder="Defaults to the enquiry form. Or /journeys/…, /hotels/…, or a full URL" />
        </div>
      </div>

      <ImageField label="Picture" value={image} onChange={setImage} />

      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-ink">
          <select name="status" className="field !w-auto !py-1.5" defaultValue={offer?.status ?? 'draft'}>
            <option value="draft">Draft — not shown</option>
            <option value="published">Published — live on the site</option>
          </select>
        </label>
        <SaveButton isNew={!offer} />
        {offer && (
          <button
            type="submit"
            formAction={deleteOffer}
            className="text-sm font-semibold text-danger hover:underline"
            onClick={(e) => {
              if (!confirm(`Delete “${offer.title}”?`)) e.preventDefault();
            }}
          >
            Delete
          </button>
        )}
        {state && (
          <span className={`text-sm ${state.ok ? 'text-teal-deep' : 'text-danger'}`}>{state.message}</span>
        )}
      </div>
    </form>
  );
}
