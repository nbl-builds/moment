"use client";

import { formatDate, formatPrice, formatTime, normalizePkPhone, type PayoutAccountRow, type PayoutRow } from "@moment/shared";
import { useEffect, useState } from "react";
import { PortalIcon } from "@/components/portal/icon";
import { Sheet } from "@/components/portal/sheet";
import { useToast } from "@/components/portal/toast";
import { requestWithdrawal } from "@/features/portal/insights/mock";
import { mockPayoutAccounts, savePayoutAccount, type PayoutProvider, type SavedPayoutAccount } from "./mock";
import styles from "./account.module.css";

const PROVIDERS: { value: PayoutProvider; label: string; hint: string }[] = [
  { value: "bank_transfer", label: "Bank account", hint: "Any Pakistani bank, by IBAN" },
  { value: "jazzcash", label: "JazzCash", hint: "Your JazzCash mobile account" },
  { value: "easypaisa", label: "Easypaisa", hint: "Your Easypaisa mobile account" },
];
const providerLabel = (p: string | null) => PROVIDERS.find((x) => x.value === p)?.label ?? p ?? "Account";

/** Figma 515:3352 (Payment & Payouts), owners only. */
export function PaymentsView({
  businessId,
  wallet,
  accounts: initialAccounts,
  payouts,
  timeZone,
}: {
  businessId: string;
  wallet: { balance: number; currency: string } | null;
  accounts: PayoutAccountRow[];
  payouts: PayoutRow[];
  timeZone: string;
}) {
  const toast = useToast();
  const [accounts, setAccounts] = useState<(PayoutAccountRow | SavedPayoutAccount)[]>(initialAccounts);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  useEffect(() => {
    void mockPayoutAccounts().then((m) => m.length && setAccounts((a) => [...a, ...m.filter((x) => !a.some((y) => y.id === x.id))]));
  }, []);
  const balance = wallet?.balance ?? 0;
  const currency = wallet?.currency ?? "PKR";

  const downloadCsv = () => {
    const header = ["Date", "Amount (PKR)", "Status", "Account", "Reference", "Period"];
    const lines = payouts.map((p) => [
      formatDate(p.paid_at ?? p.created_at, { timeZone, style: "medium" }),
      (p.amount / 100).toFixed(0),
      p.status,
      `${providerLabel(p.provider)}${p.account?.account_number_last4 ? ` •••${p.account.account_number_last4}` : ""}`,
      p.provider_payout_ref ?? "",
      `${p.period_start} to ${p.period_end}`,
    ]);
    const csv = [header, ...lines].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "moment-payouts.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={styles.page}>
      <h1 className={styles.pageTitle}>Payment Method</h1>
      <div className={styles.cards}>
        <div className={styles.panelCard}>
          <div className={styles.balance}>
            <span className={styles.figure}>
              <PortalIcon name="wallet" size={42} />
              {formatPrice(balance, { currency })}
            </span>
            <span className={styles.small}>Available to withdraw</span>
            <button type="button" className={styles.outline} onClick={() => setWithdrawOpen(true)} disabled={balance <= 0 || accounts.length === 0}>
              Withdraw Payment
            </button>
            {accounts.length === 0 ? <span className={styles.small}>Add a payout account first.</span> : null}
          </div>
          <div className={styles.row} data-last-plain="true">
            <div className={styles.rowMain}>
              <span className={styles.cardTitle}>Payment Method</span>
              <span className={styles.muted}>Where Moment sends your earnings: a bank account, JazzCash or Easypaisa.</span>
              {accounts.length ? (
                <ul className={styles.checkList} aria-label="Payout accounts">
                  {accounts.map((a) => (
                    <li key={a.id} className={styles.small}>
                      <strong>{providerLabel(a.provider)}</strong> · {a.account_title} · {a.iban_masked ?? (a.account_number_last4 ? `•••• ${a.account_number_last4}` : "")}
                      {a.is_default ? " · Default" : ""}
                      {a.verified_at ? "" : " · Checking"}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
            <button type="button" className={styles.outline} onClick={() => setAddOpen(true)}>
              Add Payment Method
            </button>
          </div>
        </div>

        <div className={styles.panelCard}>
          <div className={styles.historyHead}>
            <h2 className={styles.cardTitle}>Payout History</h2>
            <button type="button" className={styles.downloadLink} onClick={downloadCsv} disabled={!payouts.length}>
              Download CSV
            </button>
          </div>
          {payouts.length ? (
            <ul className={styles.rows}>
              {payouts.map((p) => (
                <li key={p.id} className={styles.row} style={{ minHeight: 0 }}>
                  <div className={styles.rowMain}>
                    <span className={styles.historyTitle}>
                      {formatPrice(p.amount, { currency: p.currency })} {p.status === "paid" ? "has been withdrawn" : p.status === "failed" ? "failed to send" : "is on its way"} to your{" "}
                      {providerLabel(p.account?.provider ?? p.provider)}
                      {p.account?.account_number_last4 ? ` •••${p.account.account_number_last4}` : ""}.
                    </span>
                    <span className={styles.muted}>
                      {formatDate(p.paid_at ?? p.created_at, { timeZone, style: "medium" })} - {formatTime(p.paid_at ?? p.created_at, timeZone)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.muted} style={{ padding: "var(--web-space-20) 0" }}>
              No payouts yet. Payouts appear here once Moment sends your earnings.
            </p>
          )}
        </div>
      </div>

      <WithdrawSheet
        open={withdrawOpen}
        onClose={() => setWithdrawOpen(false)}
        balance={balance}
        currency={currency}
        onConfirm={async (amount) => {
          const r = await requestWithdrawal(businessId, amount, currency);
          toast(`Withdrawal ${r.id} requested. It usually arrives in 2 working days.`);
        }}
      />
      <AddAccountSheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSaved={(a) => {
          setAccounts((x) => [...x, a]);
          toast("Payout account added. We’ll check it before the first payout.");
        }}
      />
    </div>
  );
}

function WithdrawSheet({ open, onClose, balance, currency, onConfirm }: { open: boolean; onClose: () => void; balance: number; currency: string; onConfirm: (amount: number) => Promise<void> }) {
  const [text, setText] = useState(String(Math.floor(balance / 100)));
  const [busy, setBusy] = useState(false);
  const amount = Math.round(Number(text.replace(/\D/g, "")) * 100);
  const valid = amount >= 100_00 && amount <= balance;
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Withdraw Payment"
      footer={
        <button
          type="button"
          className={`${styles.dark} ${styles.full}`}
          disabled={!valid || busy}
          onClick={async () => {
            setBusy(true);
            await onConfirm(amount);
            setBusy(false);
            onClose();
          }}
        >
          {busy ? "Requesting…" : `Withdraw ${valid ? formatPrice(amount, { currency }) : ""}`}
        </button>
      }
    >
      <div className={styles.stack}>
        <label className={styles.field}>
          <span className={styles.label}>Amount (Rs)</span>
          <input className={styles.input} inputMode="numeric" value={text} onChange={(e) => setText(e.target.value.replace(/\D/g, ""))} />
        </label>
        <span className={styles.small}>Up to {formatPrice(balance, { currency })}. Minimum Rs 100.</span>
      </div>
    </Sheet>
  );
}

function AddAccountSheet({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: (a: SavedPayoutAccount) => void }) {
  const [provider, setProvider] = useState<PayoutProvider>("bank_transfer");
  const [title, setTitle] = useState("");
  const [bank, setBank] = useState("");
  const [iban, setIban] = useState("");
  const [mobile, setMobile] = useState("");
  const [busy, setBusy] = useState(false);
  const ibanClean = iban.replace(/\s/g, "").toUpperCase();
  const valid =
    title.trim().length >= 2 && (provider === "bank_transfer" ? /^PK\d{2}[A-Z]{4}\d{16}$/.test(ibanClean) && bank.trim().length >= 2 : Boolean(normalizePkPhone(mobile)));

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Add Payment Method"
      footer={
        <button
          type="button"
          className={`${styles.dark} ${styles.full}`}
          disabled={!valid || busy}
          onClick={async () => {
            setBusy(true);
            const a = await savePayoutAccount({
              provider,
              accountTitle: title.trim(),
              bankName: bank.trim() || undefined,
              iban: provider === "bank_transfer" ? ibanClean : undefined,
              mobile: provider === "bank_transfer" ? undefined : (normalizePkPhone(mobile) ?? undefined),
            });
            setBusy(false);
            onSaved(a);
            onClose();
          }}
        >
          {busy ? "Saving…" : "Save account"}
        </button>
      }
    >
      <div className={styles.stack}>
        <ul className={styles.checkList} role="radiogroup" aria-label="Account type">
          {PROVIDERS.map((p) => (
            <li key={p.value}>
              <button type="button" role="radio" aria-checked={provider === p.value} className={styles.choice} onClick={() => setProvider(p.value)}>
                <span>
                  {p.label}
                  <br />
                  <span className={styles.small}>{p.hint}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
        <label className={styles.field}>
          <span className={styles.label}>Account title</span>
          <input className={styles.input} value={title} maxLength={80} placeholder="Name on the account" onChange={(e) => setTitle(e.target.value)} />
        </label>
        {provider === "bank_transfer" ? (
          <>
            <label className={styles.field}>
              <span className={styles.label}>Bank</span>
              <input className={styles.input} value={bank} maxLength={60} placeholder="e.g. Meezan Bank" onChange={(e) => setBank(e.target.value)} />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>IBAN</span>
              <input className={styles.input} value={iban} maxLength={29} placeholder="PK36 SCBL 0000 0011 2345 6702" onChange={(e) => setIban(e.target.value)} />
              {iban && !/^PK\d{2}[A-Z]{4}\d{16}$/.test(ibanClean) ? <span className={styles.error}>A Pakistani IBAN is PK + 22 characters.</span> : null}
            </label>
          </>
        ) : (
          <label className={styles.field}>
            <span className={styles.label}>Mobile account number</span>
            <input className={styles.input} inputMode="tel" value={mobile} placeholder="0300 1234567" onChange={(e) => setMobile(e.target.value)} />
          </label>
        )}
      </div>
    </Sheet>
  );
}
