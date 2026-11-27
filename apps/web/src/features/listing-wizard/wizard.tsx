"use client";

import { stepLabel, wizardGroups, wizardSteps, type EditorListing, type WizardStep } from "@moment/shared";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ConfirmDialog } from "@/components/portal/confirm-dialog";
import { PortalIcon } from "@/components/portal/icon";
import { Logo } from "@/components/portal/logo";
import { siteConfig } from "@/config/site";
import { useBrowserApi } from "@/lib/api/use-browser-api";
import { errorMessage } from "@/lib/business/errors";
import { saveStep } from "./save";
import { draftFrom, stepDirty, stepValid, type Draft, type Live, type WizardData } from "./state";
import { StepView } from "./steps";
import styles from "./wizard.module.css";

export interface StepContext {
  /** A staff member added on the Staff step. */
  addStaff: (member: WizardData["staff"][number]) => void;
  draft: Draft;
  set: (patch: Partial<Draft>) => void;
  data: WizardData;
  listing: EditorListing | null;
  live: Live;
  /** Photos and one-off sessions save as you go, then refresh the listing. */
  refresh: () => Promise<void>;
  goTo: (step: WizardStep) => void;
  notify: (message: string, tone?: "error") => void;
  submitted: SubmitResult | null;
  setSubmitted: (r: SubmitResult) => void;
}

export interface SubmitResult {
  status: "pending_review" | "published";
}

export function ListingWizard({ data: initial, step: initialStep, today }: { data: WizardData; step: WizardStep; today: string }) {
  const api = useBrowserApi();
  const router = useRouter();
  const [data, setData] = useState(initial);
  const [listing, setListing] = useState(initial.listing);
  const [draft, setDraft] = useState(() => draftFrom(initial, today));
  const [saved, setSaved] = useState(draft);
  const [step, setStep] = useState<WizardStep>(initialStep);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ message: string; tone?: "error" } | null>(null);
  const [pending, setPending] = useState<(() => void) | null>(null);
  const [submitted, setSubmitted] = useState<SubmitResult | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const kind = draft.type;
  const groups = useMemo(() => wizardGroups(kind), [kind]);
  const steps = useMemo(() => wizardSteps(kind), [kind]);
  const index = Math.max(0, steps.indexOf(step));
  const group = groups.find((g) => g.steps.includes(step)) ?? groups[0]!;
  // The current step's group is open; the business can open another to look.
  const [toggled, setToggled] = useState<{ forGroup: string; open: string } | null>(null);
  const openGroup = toggled?.forGroup === group.key ? toggled.open : group.key;
  const setOpenGroup = (open: string) => setToggled({ forGroup: group.key, open });

  const live: Live = { photoCount: listing?.media.length ?? 0, oneOffCount: listing?.oneOffSessions.length ?? 0 };
  const dirty = stepDirty(step, draft, saved);
  const valid = stepValid(step, draft, live);
  const isNew = !listing;
  const editing = Boolean(listing && listing.status !== "draft");

  const notify = useCallback((message: string, tone?: "error") => {
    clearTimeout(toastTimer.current);
    setToast({ message, tone });
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  }, []);

  // Leaving the page with unsaved changes asks first.
  useEffect(() => {
    if (!dirty) return;
    const onLeave = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [dirty]);

  const refresh = useCallback(async () => {
    if (!listing) return;
    const next = await api.listingEditor.get(listing.id);
    if (next) setListing(next);
  }, [api, listing]);

  const show = useCallback(
    (next: WizardStep) => {
      setStep(next);
      if (listing) window.history.replaceState(null, "", `/business/listings/${listing.id}/edit?step=${next}`);
      window.scrollTo({ top: 0 });
    },
    [listing],
  );

  /**
   * Saves the current step when it changed (or when Next moves the resume
   * point forward). Returns false when saving failed.
   */
  const saveCurrent = async (advancing = false) => {
    if (!listing) return true;
    const reached = listing.wizard_step as WizardStep | null;
    const forward = !reached || steps.indexOf(step) > steps.indexOf(reached);
    if (!dirty && !(advancing && forward && valid)) return true;
    setBusy(true);
    try {
      const progress = forward ? step : reached;
      const result = await saveStep(api, step, draft, saved, data, listing.id, progress);
      const next = { ...draft, ...result.draft };
      setDraft(next);
      setSaved(next);
      if (result.hostCard) setData((d) => ({ ...d, hostCard: result.hostCard ?? null }));
      await refresh();
      return true;
    } catch (error) {
      notify(errorMessage(error), "error");
      return false;
    } finally {
      setBusy(false);
    }
  };

  /** Leave this step: save it when valid, ask before throwing away invalid changes. */
  const leave = async (then: () => void) => {
    if (!dirty) return then();
    if (!valid) return setPending(() => then);
    if (await saveCurrent()) then();
  };

  const goTo = (next: WizardStep) => void leave(() => show(next));

  const onNext = async () => {
    if (!valid) return;
    if (isNew) {
      // Step 1 creates the draft; the edit page takes over from Basics.
      setBusy(true);
      try {
        const id = await api.listingEditor.createDraft(data.business.id, draft.type);
        router.replace(`/business/listings/${id}/edit?step=basics`);
      } catch (error) {
        notify(errorMessage(error), "error");
        setBusy(false);
      }
      return;
    }
    if (!(await saveCurrent(true))) return;
    const next = steps[index + 1];
    if (next) show(next);
  };

  const onBack = () => {
    const prev = steps[index - 1];
    if (prev) goTo(prev);
    else void leave(() => router.push("/business/listings"));
  };

  const exitHref = !listing || listing.status === "draft" || listing.status === "pending_review" ? "/business/listings?tab=draft" : `/business/listings/${listing.id}`;
  const onExit = () =>
    void leave(() => {
      router.push(exitHref);
      router.refresh();
    });

  const ctx: StepContext = {
    addStaff: (member) => setData((d) => ({ ...d, staff: [...d.staff, member] })),
    draft,
    set: (patch) => setDraft((d) => ({ ...d, ...patch })),
    data,
    listing,
    live,
    refresh,
    goTo,
    notify,
    submitted,
    setSubmitted,
  };

  const stateOf = (s: WizardStep): "current" | "done" | "todo" => {
    if (s === step) return "current";
    if (!listing) return "todo";
    if (s === "type") return "done";
    if (s === "review") return listing.status === "draft" ? "todo" : "done";
    // Done = saved and complete. Drafts also need to have reached it (defaults alone don't count).
    const reached = listing.status !== "draft" || steps.indexOf(s) <= steps.indexOf(listing.wizard_step as WizardStep);
    return reached && stepValid(s, saved, live) ? "done" : "todo";
  };

  const atReview = step === "review";

  return (
    <div className={styles.page}>
      <header className={styles.topBar}>
        <Link href="/business/dashboard" className={styles.logoLink} aria-label="Moment business home" onClick={(e) => guardLink(e, dirty, () => router.push("/business/dashboard"), leave)}>
          <Logo tone="dark" />
        </Link>
        <a href={`mailto:${siteConfig.contactEmail}`} className={styles.contact}>
          Contact Us
        </a>
      </header>

      <div className={styles.body}>
        <div className={styles.head}>
          <h1 className={styles.title}>{editing ? "Edit listing" : "Create New Listing"}</h1>
          {submitted ? null : (
            <div className={styles.actions}>
              <button type="button" className={styles.textButton} onClick={onBack} disabled={busy}>
                Back
              </button>
              {atReview ? null : (
                <button type="button" className={styles.next} onClick={onNext} disabled={!valid || busy} aria-busy={busy || undefined}>
                  {busy ? <span className={styles.spinner} aria-hidden /> : null}
                  Next
                </button>
              )}
            </div>
          )}
        </div>

        <div className={styles.columns}>
          <nav className={styles.sidebar} aria-label="Listing steps">
            {groups.map((g) => {
              const open = openGroup === g.key;
              return (
                <div key={g.key}>
                  <button type="button" className={styles.groupButton} aria-expanded={open} onClick={() => setOpenGroup(open ? "" : g.key)}>
                    {g.label}
                    <span className={styles.chevron}>
                      <PortalIcon name="chevron-down-sm" />
                    </span>
                  </button>
                  {open ? (
                    <ul className={styles.stepList} style={{ marginTop: "var(--web-wizard-row-gap)" }}>
                      {g.steps.map((s) => {
                        const state = stateOf(s);
                        return (
                          <li key={s}>
                            <button
                              type="button"
                              className={styles.stepLink}
                              data-state={state}
                              aria-current={state === "current" ? "step" : undefined}
                              disabled={!listing && s !== "type"}
                              onClick={() => s !== step && goTo(s)}
                            >
                              {stepLabel(s, kind)}
                              {state === "current" ? <span className={styles.dot} aria-hidden /> : null}
                              {state === "done" ? <PortalIcon name="check-circle-14" /> : null}
                              {state === "done" ? <span className={styles.srOnly}>(done)</span> : null}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  ) : null}
                </div>
              );
            })}
          </nav>

          <div className={styles.mainColumn}>
            <div className={styles.mobileSteps}>
              <select className={styles.select} aria-label="Step" value={step} onChange={(e) => goTo(e.target.value as WizardStep)} disabled={!listing}>
                {groups.map((g) => (
                  <optgroup key={g.key} label={g.label}>
                    {g.steps.map((s) => (
                      <option key={s} value={s}>
                        {`${stateOf(s) === "done" ? "✓ " : ""}${stepLabel(s, kind)}`}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            <main className={styles.main}>
              <StepView step={step} ctx={ctx} />
            </main>
            <div className={styles.progress}>
              <div
                className={styles.track}
                role="progressbar"
                aria-label="Progress"
                aria-valuemin={0}
                aria-valuemax={steps.length}
                aria-valuenow={index + 1}
              >
                <div className={styles.fill} style={{ width: `${((index + 1) / steps.length) * 100}%` }} />
              </div>
              <div className={styles.progressRow}>
                <span>{group.label}</span>
                {listing ? (
                  <button type="button" className={styles.textButton} onClick={onExit} disabled={busy}>
                    Save &amp; exit
                  </button>
                ) : (
                  <Link href="/business/listings" className={styles.textButton}>
                    Cancel
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(pending)}
        title="Leave without saving?"
        confirmLabel="Discard changes"
        onCancel={() => setPending(null)}
        onConfirm={() => {
          const then = pending;
          setPending(null);
          setDraft(saved);
          then?.();
        }}
      >
        This step isn&apos;t complete, so your changes here can&apos;t be saved yet.
      </ConfirmDialog>

      {toast ? (
        <div className={styles.toast} data-tone={toast.tone} role={toast.tone === "error" ? "alert" : "status"}>
          {toast.message}
        </div>
      ) : null}
    </div>
  );
}

function guardLink(e: React.MouseEvent, dirty: boolean, go: () => void, leave: (then: () => void) => Promise<void>) {
  if (!dirty) return;
  e.preventDefault();
  void leave(go);
}

