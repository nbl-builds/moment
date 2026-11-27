import { findCity, type MomentApi, type WizardStep } from "@moment/shared";
import { toMinor, type Draft, type WizardData } from "./state";

export interface SaveResult {
  /** Fields the server changed (the host joins an experience's staff). */
  draft?: Partial<Draft>;
  hostCard?: WizardData["hostCard"];
}

/** Saves one step of the draft. Steps that save as you go (photos, one-off sessions) save nothing here. */
/** `progress` is the furthest step reached (where the wizard resumes); it never moves back. */
export async function saveStep(api: MomentApi, step: WizardStep, d: Draft, saved: Draft, data: WizardData, listingId: string, progress: WizardStep): Promise<SaveResult> {
  const ed = api.listingEditor;
  const businessId = data.business.id;
  const next = { wizard_step: progress };
  switch (step) {
    case "type":
      await ed.save(listingId, {
        ...next,
        type: d.type,
        booking_mode: d.type === "service" ? "appointment" : "slot",
        ...(d.type === "service" ? { max_guests: 1, min_guests: 1, private_max_guests: 0 } : null),
      });
      return {};
    case "basics":
      await ed.save(listingId, { ...next, city: d.city, languages: d.languages, province: d.province || findCity(d.city)?.province || null });
      return {};
    case "category":
      await ed.save(listingId, { ...next, category_id: d.categoryId });
      return {};
    case "title":
      await ed.save(listingId, { ...next, title: d.title.trim() });
      return {};
    case "details":
      await ed.save(listingId, { ...next, description: d.description.trim(), duration_minutes: d.duration });
      return {};
    case "location":
      await Promise.all([
        ed.save(listingId, {
          ...next,
          address_line1: d.street.trim(),
          city: d.city,
          province: d.province,
          postal_code: d.postalCode || null,
          meeting_point_notes: d.notes.trim() || null,
        }),
        JSON.stringify(d.pin) !== JSON.stringify(saved.pin) ? ed.setPin(listingId, d.pin) : null,
      ]);
      return {};
    case "provide":
      await ed.save(listingId, { ...next, includes: d.includes });
      return {};
    case "requirements":
      await ed.save(listingId, { ...next, min_age: d.minAge, activity_level: d.activity, skill_level: d.skill });
      return {};
    case "group":
      await ed.save(listingId, { ...next, max_guests: d.maxGuests, min_guests: 1, private_max_guests: d.privateMax });
      return {};
    case "staff":
      await Promise.all([ed.save(listingId, next), ed.setListingStaff({ businessId, listingId, staffIds: d.staffIds })]);
      return {};
    case "availability":
      if (d.type === "service") {
        await ed.save(listingId, { ...next, buffer_minutes: d.buffer, slot_interval_minutes: d.interval });
        await Promise.all(
          d.staffIds
            .filter((id) => JSON.stringify(d.staffHours[id] ?? []) !== JSON.stringify(saved.staffHours[id] ?? []))
            .map((staffId) => ed.saveStaffHours({ businessId, staffId, hours: (d.staffHours[staffId] ?? []).filter((h) => h.start < h.end) })),
        );
      } else {
        await ed.save(listingId, next);
        const changed = ["weekdays", "times", "validFrom", "validUntil"].some(
          (k) => JSON.stringify(d[k as keyof Draft]) !== JSON.stringify(saved[k as keyof Draft]),
        );
        if (changed) {
          await ed.saveWeeklySchedule({
            businessId,
            listingId,
            capacity: d.maxGuests,
            schedule: d.weekdays.length && d.times.length ? { weekdays: d.weekdays, times: d.times, validFrom: d.validFrom, validUntil: d.validUntil || null } : null,
          });
        }
      }
      return {};
    case "booking":
      await ed.save(listingId, { ...next, instant_book: d.instantBook, booking_cutoff_minutes: d.cutoff, cancellation_policy: d.policy });
      return {};
    case "pricing":
      await ed.save(listingId, {
        ...next,
        price_unit: d.priceUnit,
        price_amount: toMinor(d.price),
        private_price_amount: d.privateMax > 0 ? toMinor(d.privatePrice) || null : null,
      });
      if (JSON.stringify(d.options) !== JSON.stringify(saved.options)) {
        await ed.saveOptions({
          businessId,
          listingId,
          options: d.options.map((o) => ({ id: o.id, name: o.name.trim(), price_amount: toMinor(o.price), duration_minutes: o.duration })),
        });
      }
      return {};
    case "discount":
      await ed.save(listingId, {
        ...next,
        group_discount_min_guests: d.groupOn ? d.groupMin : null,
        group_discount_percent: d.groupOn ? d.groupPercent : null,
        early_bird_days: d.earlyOn ? d.earlyDays : null,
        early_bird_percent: d.earlyOn ? d.earlyPercent : null,
      });
      return {};
    case "host": {
      const card = await ed.saveHostCard({
        businessId,
        id: data.hostCard?.id,
        displayName: d.hostName.trim(),
        bio: d.hostBio.trim() || null,
        languages: d.hostLanguages,
        avatarUrl: d.hostAvatar,
      });
      await ed.save(listingId, next);
      // Experiences: the host card is who guests meet. Services list their staff instead.
      if (d.type === "experience" && !d.staffIds.includes(card.id)) {
        const staffIds = [...d.staffIds, card.id];
        await ed.setListingStaff({ businessId, listingId, staffIds });
        return { hostCard: card, draft: { staffIds } };
      }
      return { hostCard: card };
    }
    case "photos":
    case "review":
      await ed.save(listingId, next);
      return {};
  }
}
