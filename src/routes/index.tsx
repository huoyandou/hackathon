import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Camera, CloudRain, House, RotateCcw, Scale, ShieldCheck } from "lucide-react";
import {
  MEASURES,
  POLICY,
  borne,
  excessFor,
  lossFor,
  payable,
  readyCredit,
  type MeasureId,
  type Phase,
  type ProofState,
} from "@/lib/gale";

export const Route = createFileRoute("/")({ component: Home });

type Screen = "wallet" | "warning" | "photos" | "desk" | "claim";
type Proofs = Record<MeasureId, ProofState>;

const EMPTY: Proofs = { stock: "none", shutter: "none", door: "none" };

const PHOTO: Record<MeasureId, { src: string; alt: string; taken: string }> = {
  stock: {
    src: "/proof/stock.jpg",
    alt: "Drink crates on a high shelf and a clear cafe floor",
    taken: "3 Oct 2026 · 13:41",
  },
  shutter: {
    src: "/proof/shutter.jpg",
    alt: "Metal shutter fully down on a wet street",
    taken: "3 Oct 2026 · 13:46",
  },
  door: {
    src: "/proof/door.jpg",
    alt: "Sandbags across the cafe door",
    taken: "3 Oct 2026 · 13:52",
  },
};

const NAV: { id: Screen; label: string; icon: typeof House }[] = [
  { id: "wallet", label: "Wallet", icon: House },
  { id: "warning", label: "Warning", icon: CloudRain },
  { id: "photos", label: "Photos", icon: Camera },
  { id: "desk", label: "Desk", icon: ShieldCheck },
  { id: "claim", label: "Claim", icon: Scale },
];

function hkd(n: number): string {
  return `HK$${n.toLocaleString("en-HK")}`;
}

function Home() {
  const [phase, setPhase] = useState<Phase>("watch");
  const [screen, setScreen] = useState<Screen>("wallet");
  const [proofs, setProofs] = useState<Proofs>(EMPTY);
  const [lens, setLens] = useState<MeasureId | null>(null);
  const [shot, setShot] = useState(false);
  const [log, setLog] = useState<{ id: number; text: string }[]>([
    { id: 1, text: "Policy on file. Annual premium 12,000. Typhoon excess 8,000." },
  ]);

  const open = phase === "window";
  const accepted = new Set(MEASURES.filter((m) => proofs[m.id] === "accepted").map((m) => m.id));
  const counted = phase === "watch" ? new Set<MeasureId>() : accepted;
  const excess = excessFor(counted.size);
  const loss = lossFor(counted);
  const credit = readyCredit(counted.size, phase !== "watch");
  const pay = payable(loss, excess);
  const keep = borne(loss, excess);
  const neighborLoss = lossFor(new Set());
  const neighborExcess = excessFor(0);
  const neighborPay = payable(neighborLoss, neighborExcess);
  const neighborKeep = borne(neighborLoss, neighborExcess);

  function add(text: string) {
    setLog((prev) => [{ id: (prev[0]?.id ?? 0) + 1, text }, ...prev]);
  }

  function issueWarning() {
    if (phase !== "watch") return;
    setPhase("window");
    setScreen("photos");
    add("Observatory: No. 8 likely within 3 hours. The shop app asks for three photos. Nothing else.");
  }

  function submitPhoto() {
    if (!lens || !open || !shot) return;
    const id = lens;
    setProofs((prev) => ({ ...prev, [id]: "pending" }));
    add(`${titleOf(id)} photo sent to the desk. Not counted until a person accepts it.`);
    setLens(null);
    setShot(false);
    setScreen("photos");
  }

  function accept(id: MeasureId) {
    if (!open) return;
    let message = "";
    setProofs((prev) => {
      if (prev[id] !== "pending") return prev;
      const next = { ...prev, [id]: "accepted" as const };
      const n = MEASURES.filter((m) => next[m.id] === "accepted").length;
      const saved = MEASURES.find((m) => m.id === id)?.lossAvoided ?? 0;
      message =
        n === MEASURES.length
          ? `Desk accepted ${titleOf(id)}. All three in time. Excess ${hkd(excessFor(MEASURES.length))}. Credit ${hkd(POLICY.readyCredit)}.`
          : `Desk accepted ${titleOf(id)}. ${hkd(saved)} stays out of the water.`;
      return next;
    });
    if (message) add(message);
  }

  function sendBack(id: MeasureId) {
    if (!open) return;
    let message = "";
    setProofs((prev) => {
      if (prev[id] !== "pending") return prev;
      message = `${titleOf(id)} sent back. The shop can photograph it again.`;
      return { ...prev, [id]: "none" };
    });
    if (message) add(message);
  }

  function hoist() {
    if (phase !== "window") return;
    const dropped = MEASURES.filter((m) => proofs[m.id] === "pending").map((m) => m.title);
    setProofs((prev) => {
      const next = { ...prev };
      for (const m of MEASURES) if (next[m.id] === "pending") next[m.id] = "none";
      return next;
    });
    setPhase("closed");
    setScreen("claim");
    add(
      dropped.length
        ? `No. 8 hoisted. Unreviewed photos dropped: ${dropped.join(", ")}.`
        : `No. 8 hoisted. ${accepted.size} of 3 photos stand.`,
    );
  }

  function settle() {
    if (phase !== "closed") return;
    setPhase("settled");
    add(
      `Claim closed. This shop bears ${hkd(keep)}. Next door bears ${hkd(neighborKeep)}. Insurer pays ${hkd(pay + credit)} here, ${hkd(neighborPay)} next door.`,
    );
  }

  function reset() {
    setPhase("watch");
    setScreen("wallet");
    setProofs(EMPTY);
    setLens(null);
    setShot(false);
    setLog([{ id: 1, text: "File reset. Same policy, no warning." }]);
  }

  const shopMoney = { loss, excess, pay, keep, credit };
  const neighborMoney = {
    loss: neighborLoss,
    excess: neighborExcess,
    pay: neighborPay,
    keep: neighborKeep,
    credit: 0,
  };

  return (
    <div className="min-h-screen bg-surface text-ink">
      <header className="border-b-2 border-teal bg-bg">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-3 px-4 py-3">
          <Wordmark />
          <nav className="order-3 flex w-full gap-1 overflow-x-auto sm:order-none sm:w-auto sm:min-w-0 sm:flex-1">
            {NAV.map((item) => {
              const Icon = item.icon;
              const on = screen === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setScreen(item.id)}
                  className={
                    "inline-flex min-h-11 shrink-0 items-center gap-2 px-3 text-sm font-medium " +
                    (on ? "border-b-2 border-teal text-ink" : "text-muted")
                  }
                >
                  <Icon className="size-4" aria-hidden="true" />
                  {item.label}
                </button>
              );
            })}
          </nav>
          <button
            type="button"
            onClick={reset}
            className="ml-auto inline-flex min-h-11 shrink-0 items-center gap-2 px-2 text-sm font-medium text-ink"
          >
            <RotateCcw className="size-4" aria-hidden="true" />
            Reset
          </button>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-4 px-4 py-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <section className="overflow-hidden rounded-card border border-line bg-bg lg:grid lg:grid-cols-[16rem_minmax(0,1fr)]">
          <BrandPanel phase={phase} done={accepted.size} />
          <div className="min-w-0 px-5 py-5">
            {screen === "wallet" && (
              <WalletScreen phase={phase} done={counted.size} onOpen={() => setScreen("warning")} />
            )}
            {screen === "warning" && <WarningScreen phase={phase} onWarn={issueWarning} onPhotos={() => setScreen("photos")} />}
            {screen === "photos" && (
              <PhotosScreen
                phase={phase}
                proofs={proofs}
                onShoot={(id) => {
                  setLens(id);
                  setShot(false);
                }}
                onDesk={() => setScreen("desk")}
                onWarn={() => setScreen("warning")}
              />
            )}
            {screen === "desk" && (
              <DeskScreen phase={phase} proofs={proofs} onAccept={accept} onSendBack={sendBack} onHoist={hoist} />
            )}
            {screen === "claim" && (
              <ClaimScreen
                phase={phase}
                proofs={proofs}
                shop={shopMoney}
                neighbor={neighborMoney}
                onSettle={settle}
              />
            )}
          </div>
        </section>

        <aside className="rounded-card border border-line bg-bg p-4">
          <h2 className="text-sm font-semibold text-ink">Activity</h2>
          <ol className="mt-3 max-h-[32rem] space-y-3 overflow-auto">
            {log.map((line) => (
              <li key={line.id} className="border-t border-line pt-3 text-sm leading-relaxed text-ink first:border-t-0 first:pt-0">
                {line.text}
              </li>
            ))}
          </ol>
        </aside>
      </main>

      <footer className="bg-ink px-4 py-3 text-sm text-bg">Synthetic demo. Not a bolttech policy.</footer>

      {lens && (
        <CameraSheet
          id={lens}
          shot={shot}
          onShutter={() => setShot(true)}
          onRetake={() => setShot(false)}
          onSubmit={submitPhoto}
          onClose={() => {
            setLens(null);
            setShot(false);
          }}
        />
      )}
    </div>
  );
}

function titleOf(id: MeasureId): string {
  return MEASURES.find((m) => m.id === id)?.title ?? id;
}

function phaseLabel(phase: Phase): string {
  if (phase === "watch") return "Watching";
  if (phase === "window") return "Window open";
  if (phase === "closed") return "No. 8 up";
  return "Settled";
}

function Wordmark() {
  return (
    <p className="shrink-0 text-xl font-semibold tracking-tight text-ink">
      bolt<span className="text-teal">tech</span>
    </p>
  );
}

function BrandPanel({ phase, done }: { phase: Phase; done: number }) {
  return (
    <aside className="relative bg-teal px-5 py-8 text-ink">
      <span className="absolute right-5 top-5 size-3 bg-bg" aria-hidden="true" />
      <span className="absolute right-10 top-10 size-3 bg-bg" aria-hidden="true" />
      <p className="text-sm font-medium">Harbour Cafe</p>
      <p className="mt-2 text-2xl font-semibold leading-tight">Cover that asks for the photo before the water.</p>
      <p className="mt-3 text-sm leading-relaxed">18 Centre Street, Sai Ying Pun.</p>
      <p className="mt-6 text-sm font-medium">
        {phaseLabel(phase)} · {done} of 3 photos
      </p>
      <span className="absolute inset-x-0 bottom-0 h-1 bg-sun" />
    </aside>
  );
}

function Btn({
  children,
  onClick,
  disabled,
  tone = "ink",
}: {
  children: string;
  onClick: () => void;
  disabled?: boolean;
  tone?: "ink" | "ghost";
}) {
  const look = tone === "ink" ? "bg-ink text-bg" : "border border-line bg-bg text-ink";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex min-h-11 items-center justify-center rounded-btn px-4 text-sm font-medium disabled:opacity-40 ${look}`}
    >
      {children}
    </button>
  );
}

function Pill({ state }: { state: ProofState }) {
  const label = state === "accepted" ? "Accepted" : state === "pending" ? "With desk" : "Needed";
  const look = state === "accepted" ? "bg-teal text-ink" : state === "pending" ? "bg-sun text-ink" : "bg-surface text-muted";
  return <span className={`inline-flex items-center rounded-btn px-2 py-1 text-sm font-medium ${look}`}>{label}</span>;
}

function Score({ done }: { done: number }) {
  const r = 32;
  const c = 2 * Math.PI * r;
  const dash = (done / MEASURES.length) * c;
  return (
    <div className="relative size-24 shrink-0">
      <svg viewBox="0 0 80 80" className="size-24" aria-hidden="true">
        <circle cx="40" cy="40" r={r} fill="none" stroke="var(--color-line)" strokeWidth="8" />
        <circle
          cx="40"
          cy="40"
          r={r}
          fill="none"
          stroke="var(--color-teal)"
          strokeWidth="8"
          strokeDasharray={`${dash} ${c - dash}`}
          transform="rotate(-90 40 40)"
        />
      </svg>
      <p className="absolute inset-0 grid place-items-center text-sm font-semibold text-ink">
        {done}/{MEASURES.length}
      </p>
    </div>
  );
}

function WalletScreen({ phase, done, onOpen }: { phase: Phase; done: number; onOpen: () => void }) {
  return (
    <div>
      <p className="text-sm text-muted">Policy wallet</p>
      <h1 className="mt-1 text-2xl font-semibold text-ink">Welcome back, Harbour Cafe</h1>
      <p className="mt-1 max-w-lg text-sm leading-relaxed text-muted">One cover. It stays quiet until the Observatory speaks.</p>
      <div className="mt-5 flex items-center gap-4 rounded-card border border-line p-4">
        <Score done={done} />
        <div>
          <p className="font-medium text-ink">Protection score</p>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            {done === 0
              ? "No accepted photo yet. The excess is still the full amount."
              : `${done} accepted. Each one takes ${hkd(POLICY.creditEach)} off the excess.`}
          </p>
        </div>
      </div>
      <article className="mt-4 rounded-card border border-line p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-medium text-ink">Typhoon and rain</p>
            <p className="text-sm text-muted">{POLICY.street}</p>
          </div>
          <span className="rounded-btn bg-teal px-2 py-1 text-sm font-medium text-ink">{phaseLabel(phase)}</span>
        </div>
        <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted">Annual premium</dt>
            <dd className="font-medium">{hkd(POLICY.annualPremium)}</dd>
          </div>
          <div>
            <dt className="text-muted">Typhoon excess</dt>
            <dd className="font-medium">{hkd(POLICY.excess)}</dd>
          </div>
          <div>
            <dt className="text-muted">Each accepted photo</dt>
            <dd className="font-medium">−{hkd(POLICY.creditEach)} excess</dd>
          </div>
          <div>
            <dt className="text-muted">All three before No. 8</dt>
            <dd className="font-medium">{hkd(POLICY.readyCredit)} credit</dd>
          </div>
        </dl>
      </article>
      <div className="mt-5">
        <Btn onClick={onOpen}>Open the warning</Btn>
      </div>
    </div>
  );
}

function WarningScreen({ phase, onWarn, onPhotos }: { phase: Phase; onWarn: () => void; onPhotos: () => void }) {
  const steps = [
    { name: "Standby", on: true },
    { name: "No. 3", on: true },
    { name: "Pre-No. 8", on: phase !== "watch" },
    { name: "No. 8", on: phase === "closed" || phase === "settled" },
  ];
  return (
    <div>
      <p className="text-sm text-muted">Question 1 of the storm</p>
      <h1 className="mt-1 text-2xl font-semibold text-ink">Observatory</h1>
      <p className="mt-1 max-w-lg text-sm leading-relaxed text-muted">
        Synthetic Hong Kong Observatory feed. Issuing the warning opens the camera. After No. 8, a late photo does not count.
      </p>
      <ol className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {steps.map((step) => (
          <li key={step.name} className={"rounded-card px-3 py-3 text-sm font-medium " + (step.on ? "bg-teal text-ink" : "bg-surface text-muted")}>
            {step.name}
          </li>
        ))}
      </ol>
      <div className="mt-4 rounded-card border border-line p-4">
        <p className="font-medium text-ink">{phase === "watch" ? "No. 8 is not up yet." : "Pre-No. 8 is on the file."}</p>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          {phase === "watch"
            ? "Likely within 3 hours. The cover asks for three photos of work already done."
            : "The shop can still photograph the work until someone hoists No. 8."}
        </p>
        <ul className="mt-3 space-y-1 text-sm text-ink">
          {MEASURES.map((item, i) => (
            <li key={item.id}>
              {i + 1}. {item.title}
            </li>
          ))}
        </ul>
      </div>
      <div className="mt-5 flex flex-wrap gap-3">
        {phase === "watch" ? <Btn onClick={onWarn}>Issue pre-No. 8 warning</Btn> : <Btn onClick={onPhotos}>Photograph the work</Btn>}
      </div>
    </div>
  );
}

function PhotosScreen({
  phase,
  proofs,
  onShoot,
  onDesk,
  onWarn,
}: {
  phase: Phase;
  proofs: Proofs;
  onShoot: (id: MeasureId) => void;
  onDesk: () => void;
  onWarn: () => void;
}) {
  const waiting = MEASURES.some((m) => proofs[m.id] === "pending");
  return (
    <div>
      <p className="text-sm text-muted">Photo proof</p>
      <h1 className="mt-1 text-2xl font-semibold text-ink">Show the work, not a tick box</h1>
      <p className="mt-1 max-w-lg text-sm leading-relaxed text-muted">
        Each step needs a photo of this shop. The model does not sign its own work. A person on Desk accepts it.
      </p>
      {phase === "watch" ? (
        <div className="mt-5">
          <p className="text-sm text-muted">The camera stays shut until the warning is issued.</p>
          <div className="mt-3">
            <Btn onClick={onWarn}>Go to the warning</Btn>
          </div>
        </div>
      ) : (
        <ul className="mt-5 divide-y divide-line border-y border-line">
          {MEASURES.map((item, i) => (
            <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
              <div className="min-w-0">
                <p className="text-sm text-muted">
                  Step {i + 1} of {MEASURES.length}
                </p>
                <p className="font-medium text-ink">{item.title}</p>
                <p className="text-sm leading-relaxed text-muted">{item.detail}</p>
                <p className="text-sm text-ink">Keeps {hkd(item.lossAvoided)} out of the water.</p>
              </div>
              <div className="flex items-center gap-3">
                <Pill state={proofs[item.id]} />
                <Btn disabled={phase !== "window" || proofs[item.id] !== "none"} onClick={() => onShoot(item.id)}>
                  Take photo
                </Btn>
              </div>
            </li>
          ))}
        </ul>
      )}
      {waiting && (
        <div className="mt-5">
          <Btn onClick={onDesk}>Review on desk</Btn>
        </div>
      )}
    </div>
  );
}

function DeskScreen({
  phase,
  proofs,
  onAccept,
  onSendBack,
  onHoist,
}: {
  phase: Phase;
  proofs: Proofs;
  onAccept: (id: MeasureId) => void;
  onSendBack: (id: MeasureId) => void;
  onHoist: () => void;
}) {
  const queue = MEASURES.filter((m) => proofs[m.id] !== "none");
  return (
    <div>
      <p className="text-sm text-muted">Partner desk</p>
      <h1 className="mt-1 text-2xl font-semibold text-ink">Does the photo show the work?</h1>
      <p className="mt-1 max-w-lg text-sm leading-relaxed text-muted">
        Accept only what you can see. Send back a bad frame. Anything still waiting is dropped when No. 8 goes up.
      </p>
      {queue.length === 0 ? (
        <p className="mt-6 text-sm text-muted">No photos yet.</p>
      ) : (
        <ul className="mt-5 grid gap-3">
          {queue.map((item) => {
            const photo = PHOTO[item.id];
            const pending = proofs[item.id] === "pending";
            return (
              <li key={item.id} className="overflow-hidden rounded-card border border-line sm:grid sm:grid-cols-[11rem_minmax(0,1fr)]">
                <img src={photo.src} alt={photo.alt} className="aspect-3/2 w-full object-cover sm:aspect-auto sm:h-full" />
                <div className="p-3">
                  <p className="font-medium text-ink">{item.title}</p>
                  <p className="text-sm text-muted">{photo.taken}</p>
                  <div className="mt-2">
                    <Pill state={proofs[item.id]} />
                  </div>
                  {pending && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Btn onClick={() => onAccept(item.id)}>Accept</Btn>
                      <Btn tone="ghost" onClick={() => onSendBack(item.id)}>
                        Send back
                      </Btn>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <div className="mt-5">
        <Btn disabled={phase !== "window"} onClick={onHoist}>
          Hoist No. 8
        </Btn>
        {phase !== "window" && <p className="mt-2 text-sm text-muted">Hoist is only available while the window is open.</p>}
      </div>
    </div>
  );
}

type ShopMoney = { loss: number; excess: number; pay: number; keep: number; credit: number };

function ClaimScreen({
  phase,
  proofs,
  shop,
  neighbor,
  onSettle,
}: {
  phase: Phase;
  proofs: Proofs;
  shop: ShopMoney;
  neighbor: ShopMoney;
  onSettle: () => void;
}) {
  return (
    <div>
      <p className="text-sm text-muted">After the signal</p>
      <h1 className="mt-1 text-2xl font-semibold text-ink">Same street, same policy</h1>
      <p className="mt-1 max-w-lg text-sm leading-relaxed text-muted">
        Only an accepted photo changes the excess, and only the work in that photo keeps stock dry. Next door did nothing.
      </p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <MoneyCard name={POLICY.shop} row={shop} proofs={proofs} showPhotos />
        <MoneyCard name={POLICY.neighbor} row={neighbor} />
      </div>
      <div className="mt-5">
        <Btn disabled={phase !== "closed"} onClick={onSettle}>
          Settle the claim
        </Btn>
        {phase !== "closed" && phase !== "settled" && (
          <p className="mt-2 text-sm text-muted">Settle opens after No. 8 is hoisted.</p>
        )}
      </div>
      {phase === "settled" && (
        <div className="mt-4 rounded-card bg-teal px-4 py-4 text-ink">
          <p className="font-semibold">Claim closed</p>
          <p className="mt-1 text-sm leading-relaxed">
            This shop bears {hkd(shop.keep)}. Next door bears {hkd(neighbor.keep)}. The insurer’s outlay is {hkd(shop.pay + shop.credit)} here
            and {hkd(neighbor.pay)} next door. The difference is stock that never got wet.
          </p>
        </div>
      )}
    </div>
  );
}

function MoneyCard({
  name,
  row,
  proofs,
  showPhotos,
}: {
  name: string;
  row: ShopMoney;
  proofs?: Proofs;
  showPhotos?: boolean;
}) {
  const shots = showPhotos ? MEASURES.filter((m) => proofs?.[m.id] === "accepted") : [];
  return (
    <article className="rounded-card border border-line p-4">
      <p className="font-medium text-ink">{name}</p>
      {shots.length > 0 && (
        <ul className="mt-3 flex gap-2">
          {shots.map((item) => (
            <li key={item.id}>
              <img src={PHOTO[item.id].src} alt={PHOTO[item.id].alt} className="size-14 rounded-btn object-cover" />
            </li>
          ))}
        </ul>
      )}
      <dl className="mt-3 grid grid-cols-2 gap-y-1 text-sm">
        <dt className="text-muted">Stock lost</dt>
        <dd className="text-right">{hkd(row.loss)}</dd>
        <dt className="text-muted">Excess</dt>
        <dd className="text-right">{hkd(row.excess)}</dd>
        <dt className="text-muted">Claim pay</dt>
        <dd className="text-right">{hkd(row.pay)}</dd>
        <dt className="text-muted">Shop bears</dt>
        <dd className="text-right">{hkd(row.keep)}</dd>
        <dt className="text-muted">Credit back</dt>
        <dd className="text-right">{row.credit ? hkd(row.credit) : "—"}</dd>
        <dt className="text-muted">Insurer outlay</dt>
        <dd className="text-right font-medium">{hkd(row.pay + row.credit)}</dd>
      </dl>
    </article>
  );
}

function CameraSheet({
  id,
  shot,
  onShutter,
  onRetake,
  onSubmit,
  onClose,
}: {
  id: MeasureId;
  shot: boolean;
  onShutter: () => void;
  onRetake: () => void;
  onSubmit: () => void;
  onClose: () => void;
}) {
  const photo = PHOTO[id];
  const index = MEASURES.findIndex((m) => m.id === id) + 1;
  return (
    <div className="fixed inset-0 z-20 flex flex-col bg-ink text-bg">
      <div className="flex items-center justify-between px-4 py-3">
        <button type="button" onClick={onClose} className="min-h-11 px-2 text-sm font-medium text-bg">
          Close
        </button>
        <p className="text-sm">
          Photo {index} of {MEASURES.length}
        </p>
        <span className="w-14" />
      </div>
      <div className="mx-auto min-h-0 w-full max-w-md flex-1 overflow-auto px-4">
        <div className="relative">
          <img src={photo.src} alt={photo.alt} className="aspect-3/2 w-full rounded-card object-cover" />
          {shot && <p className="absolute bottom-3 left-3 rounded-btn bg-ink px-2 py-1 text-xs text-bg">{photo.taken}</p>}
        </div>
        <p className="mt-3 text-sm font-medium text-bg">{titleOf(id)}</p>
        <p className="mt-1 text-sm leading-relaxed text-sun">
          {shot ? "Photo held. Send it only if this is the shop after the work." : "Point at the finished work, then take the photo."}
        </p>
      </div>
      <div className="flex shrink-0 justify-center gap-3 px-4 py-5">
        {!shot ? (
          <button type="button" onClick={onShutter} className="min-h-11 rounded-btn bg-bg px-6 text-sm font-medium text-ink">
            Take photo
          </button>
        ) : (
          <>
            <button type="button" onClick={onRetake} className="min-h-11 rounded-btn border border-bg px-4 text-sm font-medium text-bg">
              Retake
            </button>
            <button type="button" onClick={onSubmit} className="min-h-11 rounded-btn bg-bg px-4 text-sm font-medium text-ink">
              Send to desk
            </button>
          </>
        )}
      </div>
    </div>
  );
}
