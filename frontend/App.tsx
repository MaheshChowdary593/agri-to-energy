"use client";
import { useEffect, useMemo, useState } from "react";
import { seedUsers } from "@/shared/seed";
import { LOCATIONS } from "@/shared/locations";
import { tr } from "@/frontend/i18n";
import type { Language, Listing, Match, Role, User } from "@/shared/types";
type Offer = {
  id: string;
  company: string;
  product: string;
  pricePerTonne: number;
  distance: number;
  tonnesNeeded: number;
  score: number;
  reasons: string[];
};
const useApi = <T,>(url: string) => {
  const [data, setData] = useState<T | null>(null),
    [error, setError] = useState(false),
    [loading, setLoading] = useState(true);
  const refresh = async () => {
    setLoading(true);
    try {
      const r = await fetch(url);
      if (!r.ok) throw Error();
      setData(await r.json());
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    refresh();
  }, [url]);
  return { data, error, loading, refresh };
};
export default function Home() {
  const [lang, setLang] = useState<Language>("en"),
    [role, setRole] = useState<Role>("farmer"),
    [userId, setUserId] = useState("farmer-1"),
    [currentUser, setCurrentUser] = useState<User | null>(null),
    [page, setPage] = useState("home"),
    [selected, setSelected] = useState<Listing | null>(null),
    [offers, setOffers] = useState<Offer[]>([]),
    [advice, setAdvice] = useState<{
      estimatedTonnes: number;
      bestUses: string[];
      tip: string;
    } | null>(null),
    [msg, setMsg] = useState(""),
    [busy, setBusy] = useState(false),
    [fresh, setFresh] = useState(0);
  const t = (k: string) => tr(lang, k),
    user =
      currentUser ?? seedUsers.find((u) => u.id === userId) ?? seedUsers[0];
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.user) {
          setCurrentUser(d.user);
          setRole(d.user.role);
          setPage(d.user.role === "buyer" ? "buyer" : d.user.role);
        }
      })
      .catch(() => {});
  }, []);
  const {
      data: listings,
      error: le,
      loading: ll,
      refresh: rl,
    } = useApi<Listing[]>("/api/listings?" + fresh),
    {
      data: demands,
      error: de,
      loading: dl,
      refresh: rd,
    } = useApi<any[]>("/api/demands?" + fresh),
    { data: matches } = useApi<Match[]>("/api/matches?" + fresh),
    { data: impact } = useApi<any>("/api/impact?" + fresh),
    { data: pendingCompanies, refresh: refreshPending } = useApi<User[]>(
      "/api/admin/approvals?" + fresh,
    );
  const myListings = (listings ?? []).filter((x) => x.farmerId === user.id);
  const myDemands = (demands ?? []).filter((x) => x.buyerId === user.id);
  const goOffers = async (l: Listing) => {
    setSelected(l);
    setPage("offers");
    setMsg("");
    try {
      const r = await fetch(`/api/listings/${l.id}/matches`);
      if (!r.ok) throw Error();
      setOffers(await r.json());
    } catch {
      setMsg(t("error"));
    }
  };
  const post = async (url: string, body: any) => {
    setBusy(true);
    setMsg("");
    try {
      const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error ?? t("error"));
      return d;
    } catch (e) {
      setMsg(e instanceof Error ? e.message : t("error"));
      return null;
    } finally {
      setBusy(false);
    }
  };
  const takeOffer = async (o: Offer) => {
    const m = await post("/api/matches", {
      listingId: selected?.id,
      demandId: o.id,
    });
    if (m) {
      await fetch("/api/matches/" + m.id, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pickupDate: selected?.availableFrom }),
      });
      setMsg(
        lang === "en"
          ? "Offer accepted. Pickup scheduled."
          : lang === "hi"
            ? "ऑफ़र स्वीकार हुआ। उठान तय है।"
            : "ਪੇਸ਼ਕਸ਼ ਮਨਜ਼ੂਰ। ਚੁਕਾਈ ਤੈਅ ਹੈ।",
      );
      setFresh((x) => x + 1);
    }
  };
  const header = (
    <header className="app-header flex items-center justify-between gap-3 border-b bg-white px-4 py-3">
      <button
        onClick={() =>
          setPage(
            currentUser
              ? role === "farmer"
                ? "farmer"
                : role === "buyer"
                  ? "buyer"
                  : "admin"
              : "home",
          )
        }
        className="text-left"
      >
        <b className="text-xl text-green-800">🌾 KhetLoop</b>
        <div className="text-xs text-slate-600">Keep straw in the loop</div>
      </button>
      <div className="flex items-center gap-2">
        <label className="sr-only">{t("language")}</label>
        <select
          className="rounded-lg border p-2"
          value={lang}
          onChange={(e) => setLang(e.target.value as Language)}
          aria-label={t("language")}
        >
          <option value="en">EN</option>
          <option value="hi">हिंदी</option>
          <option value="pa">ਪੰਜਾਬੀ</option>
        </select>
        {currentUser && (
          <button
            className="secondary !p-2"
            onClick={async () => {
              await fetch("/api/auth/logout", { method: "POST" });
              setCurrentUser(null);
              setPage("home");
              setMsg("");
            }}
          >
            Log out
          </button>
        )}
      </div>
    </header>
  );
  const status = (s: string) => (
    <span className="chip">{t("status_" + s)}</span>
  );
  const frame = (children: React.ReactNode) => (
    <main className={`app-shell page-${page} mx-auto min-h-screen bg-[#f4f7ef]`}>
      {header}
      <div className={`app-content app-content-${page} space-y-4 p-4`}>
        {msg && (
          <div role="status" className="card border-amber-300 text-amber-900">
            {msg}
          </div>
        )}
        {children}
      </div>
    </main>
  );
  if (page === "home")
    return frame(
      <LoginView
        lang={lang}
        busy={busy}
        message={msg}
        onSignIn={async (phone, password) => {
          const result = await post("/api/auth/login", { phone, password });
          if (result?.user) {
            setCurrentUser(result.user);
            setRole(result.user.role);
            setPage(result.user.role);
            setMsg("");
            setFresh((x) => x + 1);
            if (result.user.role === "admin") await refreshPending();
          }
        }}
        onRegister={async (role, name, phone, password, district) => {
          const result = await post("/api/auth/register", {
            role,
            name,
            phone,
            password,
            district,
          });
          if (result?.user) {
            setCurrentUser(result.user);
            setRole(result.user.role);
            setPage(result.user.role);
            setFresh((x) => x + 1);
          } else if (result?.pending) setMsg(result.message);
        }}
      />,
    );
  if (page === "farmer")
    return frame(
      <>
        <section className="card dashboard-hero farmer-hero">
          <div className="dashboard-hero-copy">
            <span className="dashboard-eyebrow">FARMER WORKSPACE</span>
            <div className="text-sm text-slate-600">
            {user.name} · {user.district}
            </div>
          <h1 className="text-2xl font-bold">{t("dashboard")}</h1>
          <p>{t("myListings")}</p>
          </div>
          <button
            className="primary hero-action text-lg"
            onClick={() => {
              setPage("add");
              setMsg("");
            }}
          >
            ＋ {t("addResidue")}
          </button>
        </section>
        <section className="card farmer-earnings">
          <b>{t("totalEarned")}</b>
          <div className="mt-1 text-2xl font-bold">
            ₹
            {(matches ?? [])
              .filter(
                (m) =>
                  m.status === "paid" &&
                  (listings ?? []).find((l) => l.id === m.listingId)
                    ?.farmerId === user.id,
              )
              .reduce(
                (s, m) =>
                  s +
                  (listings ?? []).find((l) => l.id === m.listingId)!
                    .estimatedTonnes *
                    m.agreedPricePerTonne,
                0,
              )
              .toLocaleString("en-IN")}
          </div>
        </section>
        {ll ? (
          <div className="card">{t("loading")}</div>
        ) : le ? (
          <div className="card">
            {t("error")} <button onClick={rl}>↻</button>
          </div>
        ) : !myListings.length ? (
          <div className="card">{t("empty")}</div>
        ) : (
          myListings.map((l) => (
            <button
              key={l.id}
              className="card listing-card w-full text-left"
              onClick={() => goOffers(l)}
            >
              <div className="flex justify-between">
                <b>
                  {t(l.crop)} · {l.estimatedTonnes} t
                </b>
                {status(l.status)}
              </div>
              <div className="mt-2 text-sm text-slate-600">
                {l.acres} acres · {l.availableFrom}
              </div>
              <span className="mt-2 inline-block text-green-800">
                {t("offers")} →
              </span>
            </button>
          ))
        )}
      </>,
    );
  if (page === "add")
    return frame(
      <AddForm
        user={user}
        lang={lang}
        busy={busy}
        t={t}
        onCancel={() => setPage("farmer")}
        onSubmit={async (b) => {
          const l = await post("/api/listings", b);
          if (!l) return;
          const a = await post("/api/ai/advice", {
            crop: b.crop,
            acres: b.acres,
            district: b.district,
            language: lang,
          });
          setAdvice(a);
          await rl();
          await goOffers(l);
        }}
      />,
    );
  if (page === "offers")
    return frame(
      <>
        <button className="secondary page-back" onClick={() => setPage(role)}>
          ← {t("dashboard")}
        </button>
        <h1 className="text-2xl font-bold">{t("offers")}</h1>
        {selected && (
          <div className="card offers-summary">
            {t(selected.crop)} · {selected.estimatedTonnes} tonnes
          </div>
        )}
        {advice && (
          <div className="card advice-card border-green-300">
            <b>{t("bestUses")}</b>
            <p>{advice.bestUses.join(" · ")}</p>
            <p className="mt-2">
              {t("tip")}: {advice.tip}
            </p>
            <small>Estimate: {advice.estimatedTonnes} tonnes</small>
          </div>
        )}
        {!offers.length ? (
          <div className="card">{t("empty")}</div>
        ) : (
          offers.map((o) => (
            <div key={o.id} className="card offer-card">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-bold">{o.company}</h2>
                  <div>{o.product}</div>
                </div>
                <span className="chip">{o.score}/100</span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div>₹{o.pricePerTonne.toLocaleString("en-IN")} / t</div>
                <div>{Math.round(o.distance)} km</div>
                <div>{o.tonnesNeeded} tonnes needed</div>
                <div>
                  {t("score")}: {o.score}
                </div>
              </div>
              <ul className="mt-2 list-inside list-disc text-sm">
                {o.reasons.slice(0, 3).map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
              <button
                className="primary mt-3 w-full"
                onClick={() => takeOffer(o)}
                disabled={busy}
              >
                {t("accept")}
              </button>
            </div>
          ))
        )}
      </>,
    );
  if (page === "buyer")
    return frame(
      <>
        <section className="card dashboard-hero buyer-hero">
          <div className="dashboard-hero-copy">
            <span className="dashboard-eyebrow">BUYER WORKSPACE</span>
            <div className="text-sm text-slate-600">
            {user.name} · {user.district}
            </div>
          <h1 className="text-2xl font-bold">{t("dashboard")}</h1>
          <p className="hero-description">Find local crop residue and manage your sourcing needs.</p>
          </div>
          <button
            className="primary hero-action"
            onClick={() => setPage("demand")}
          >
            ＋ {t("postDemand")}
          </button>
        </section>
        {dl ? (
          <div className="card">{t("loading")}</div>
        ) : de ? (
          <div className="card">
            {t("error")} <button onClick={rd}>↻</button>
          </div>
        ) : myDemands.length === 0 ? (
          <div className="card">{t("empty")}</div>
        ) : (
          myDemands.map((d) => {
            const matched = (listings ?? []).filter(
              (l) => d.acceptedResidues.includes(l.crop) && l.status === "open",
            );
            return (
              <div className="card demand-card" key={d.id}>
                <b>{d.company}</b>
                <p>
                  {d.product} · {d.tonnesNeeded} t · ₹{d.pricePerTonne}/t
                </p>
                <h3 className="mt-2 font-bold">{t("matchListings")}</h3>
                {matched.length ? (
                  matched.slice(0, 5).map((l) => (
                    <div
                      key={l.id}
                      className="mt-2 flex items-center justify-between"
                    >
                      <span>
                        {l.crop} · {l.estimatedTonnes} t ·{" "}
                        {seedUsers.find((u) => u.id === l.farmerId)?.district}
                      </span>
                      <Pickup
                        match={(matches ?? []).find(
                          (m) => m.listingId === l.id && m.demandId === d.id,
                        )}
                        t={t}
                        onChange={() => setFresh((x) => x + 1)}
                      />
                    </div>
                  ))
                ) : (
                  <div>{t("empty")}</div>
                )}
              </div>
            );
          })
        )}
      </>,
    );
  if (page === "demand")
    return frame(
      <DemandForm
        user={user}
        busy={busy}
        t={t}
        onCancel={() => setPage("buyer")}
        onSubmit={async (b) => {
          const d = await post("/api/demands", b);
          if (d) {
            await rd();
            setPage("buyer");
          }
        }}
      />,
    );
  return frame(
    <>
      <section className="card dashboard-hero admin-hero">
        <div className="admin-hero-copy">
          <h1 className="text-2xl font-bold">
            {t("admin")} · {t("dashboard")}
          </h1>
          <p className="mt-2 text-xs">
            Impact factors are approximate estimates and can be edited in
            shared/config.ts.
          </p>
        </div>
        <button
          className="secondary"
          onClick={async () => {
            if (confirm("Reset all demo data?")) {
              await post("/api/reset", {});
              setFresh((x) => x + 1);
            }
          }}
        >
          {t("reset")}
        </button>
      </section>
      <section className="card admin-approvals">
        <h2 className="text-lg font-bold">Company approval requests</h2>
        {!pendingCompanies ? (
          <p className="mt-2 text-sm">Loading requests…</p>
        ) : pendingCompanies.length === 0 ? (
          <p className="mt-2 text-sm">No companies waiting for approval.</p>
        ) : (
          pendingCompanies.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between border-b py-2"
            >
              <span>
                {c.name} · {c.district}
              </span>
              <button
                className="primary !p-2"
                onClick={async () => {
                  const r = await fetch("/api/admin/approvals", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ userId: c.id }),
                  });
                  if (r.ok) {
                    await refreshPending();
                    setMsg("Company approved.");
                  }
                }}
              >
                Approve
              </button>
            </div>
          ))
        )}
      </section>
      <div className="grid grid-cols-2 gap-3 admin-kpis">
        {[
          [t("totalTonnes"), `${impact?.tonnes ?? 0} t`],
          [t("co2"), `${(impact?.co2Avoided ?? 0).toFixed(1)} t`],
          [
            t("rupees"),
            `₹${(impact?.rupeesPaid ?? 0).toLocaleString("en-IN")}`,
          ],
          [t("farmers"), impact?.farmers ?? 0],
          [t("companies"), impact?.companies ?? 0],
        ].map(([k, v]) => (
          <div className="card admin-kpi-card" key={String(k)}>
            <div className="text-sm">{k}</div>
            <b className="text-xl">{v}</b>
          </div>
        ))}
      </div>
      <section className="card admin-districts">
        <h2 className="text-lg font-bold">{t("districtBreakdown")}</h2>
        {(Object.entries(impact?.byDistrict ?? {}) as [string, number][]).map(
          ([d, n]) => (
            <div className="flex justify-between border-b py-2" key={d}>
              <span>{d}</span>
              <b>{n} t</b>
            </div>
          ),
        )}
      </section>
      <section className="card admin-listings">
        <h2 className="text-lg font-bold">{t("listings")}</h2>
        {ll ? (
          <p>{t("loading")}</p>
        ) : le ? (
          <p>{t("error")}</p>
        ) : (
          (listings ?? []).map((l) => (
            <div key={l.id} className="border-b py-2">
              <div className="flex justify-between">
                <span>
                  {seedUsers.find((u) => u.id === l.farmerId)?.name} · {l.crop}{" "}
                  · {l.estimatedTonnes} t
                </span>
                {status(l.status)}
              </div>
              {(matches ?? [])
                .filter((m) => m.listingId === l.id)
                .map((m) => (
                  <div key={m.id} className="mt-1 flex items-center gap-2">
                    <span className="text-xs">{m.id.slice(0, 10)}</span>
                    {m.status === "pickup_scheduled" && (
                      <button
                        className="secondary !p-1 text-xs"
                        onClick={async () => {
                          await fetch("/api/matches/" + m.id, {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ status: "collected" }),
                          });
                          setFresh((x) => x + 1);
                        }}
                      >
                        Mark collected
                      </button>
                    )}
                    {m.status === "collected" && (
                      <button
                        className="secondary !p-1 text-xs"
                        onClick={async () => {
                          await fetch("/api/matches/" + m.id, {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ status: "paid" }),
                          });
                          setFresh((x) => x + 1);
                        }}
                      >
                        Mark paid
                      </button>
                    )}
                    {status(m.status)}
                  </div>
                ))}
            </div>
          ))
        )}
      </section>
    </>,
  );
}
function LoginView({
  lang,
  busy,
  message,
  onSignIn,
  onRegister,
}: {
  lang: Language;
  busy: boolean;
  message: string;
  onSignIn: (phone: string, password: string) => Promise<void>;
  onRegister: (
    role: "farmer" | "buyer",
    name: string,
    phone: string,
    password: string,
    district: string,
  ) => Promise<void>;
}) {
  const [mode, setMode] = useState<"login" | "register">("login"),
    [kind, setKind] = useState<"farmer" | "buyer">("farmer"),
    [name, setName] = useState(""),
    [phone, setPhone] = useState(""),
    [password, setPassword] = useState(""),
    [district, setDistrict] = useState("Ludhiana");
  const title =
    lang === "hi"
      ? "खेतलूप में साइन इन करें"
      : lang === "pa"
        ? "ਖੇਤਲੂਪ ਵਿੱਚ ਸਾਈਨ ਇਨ ਕਰੋ"
        : "Sign in to KhetLoop";
  return (
    <div className="login-layout">
      <section className="welcome-panel">
        <div className="welcome-kicker"><span className="welcome-icon">🌾</span> GROW · GATHER · REUSE</div>
        <h1>{title}</h1>
        <p className="welcome-copy">{tr(lang, "intro")}</p>
        <div className="welcome-benefits" aria-label="KhetLoop benefits">
          <div><span>01</span><p><b>Find nearby partners</b><small>Connect with farmers and buyers in your district.</small></p></div>
          <div><span>02</span><p><b>Make residue valuable</b><small>Turn leftover crop material into a useful resource.</small></p></div>
          <div><span>03</span><p><b>Keep it simple</b><small>Manage listings and offers from one place.</small></p></div>
        </div>
        <div className="welcome-footer"><span className="live-dot" /> A better loop for every harvest</div>
      </section>
      <section className="card auth-card">
        <div className="auth-heading">
          <span className="auth-eyebrow">YOUR K H E T L O O P ACCOUNT</span>
          <h2>{mode === "login" ? "Welcome back" : "Join the community"}</h2>
          <p>{mode === "login" ? "Sign in to continue to your workspace." : "Create an account to get started."}</p>
        </div>
        <div className="mb-4 flex gap-2">
          <button
            type="button"
            aria-pressed={mode === "login"}
            className={mode === "login" ? "primary flex-1" : "secondary flex-1"}
            onClick={() => setMode("login")}
          >
            Sign in
          </button>
          <button
            type="button"
            aria-pressed={mode === "register"}
            className={
              mode === "register" ? "primary flex-1" : "secondary flex-1"
            }
            onClick={() => setMode("register")}
          >
            Create account
          </button>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (mode === "login") void onSignIn(phone, password);
            else void onRegister(kind, name, phone, password, district);
          }}
        >
          {mode === "register" && (
            <>
              <label>
                Account type
                <select
                  className="field"
                  value={kind}
                  onChange={(e) =>
                    setKind(e.target.value as "farmer" | "buyer")
                  }
                >
                  <option value="farmer">Farmer · no approval needed</option>
                  <option value="buyer">
                    Company · admin approval required
                  </option>
                </select>
              </label>
              <label>
                Full name / company name
                <input
                  className="field"
                  required
                  minLength={2}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
              <label>
                District
                <select
                  className="field"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                >
                  {LOCATIONS.map((x) => (
                    <option key={x.district}>{x.district}</option>
                  ))}
                </select>
              </label>
            </>
          )}
          <label>
            Phone number
            <input
              className="field"
              type="tel"
              autoComplete="tel"
              required
              minLength={8}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </label>
          <label>
            Password
            <input
              className="field"
              type="password"
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {message && (
            <p
              role="alert"
              className="my-3 rounded-lg bg-amber-50 p-3 text-amber-900"
            >
              {message}
            </p>
          )}
          <button className="primary mt-2 w-full text-lg" disabled={busy}>
            {busy
              ? "Please wait…"
              : mode === "login"
                ? "Sign in"
                : kind === "farmer"
                  ? "Create farmer account"
                  : "Request company account"}
          </button>
        </form>
        {mode === "login" && (
          <div className="demo-credentials mt-4 rounded-lg p-3 text-sm">
            <b>Exploring the demo?</b>
            <p>Use a demo account to preview a farmer, buyer, or admin workspace.</p>
            <details>
              <summary>Show demo sign-in details</summary>
              <div className="demo-details">
                <p>Admin: +91 90000 0000 · admin123</p>
                <p>Farmer: +91 98765 4300 · farmer123</p>
                <p>Seed companies: +91 90000 1001–1006 · company123</p>
              </div>
            </details>
            <small>New company accounts need admin approval before sign-in.</small>
          </div>
        )}
      </section>
    </div>
  );
}
function AddForm({
  user,
  lang,
  busy,
  t,
  onCancel,
  onSubmit,
}: {
  user: User;
  lang: Language;
  busy: boolean;
  t: (k: string) => string;
  onCancel: () => void;
  onSubmit: (b: any) => void;
}) {
  const [crop, setCrop] = useState<"paddy" | "wheat">("paddy"),
    [acres, setAcres] = useState(""),
    [district, setDistrict] = useState(user.district),
    [harvestDate, setH] = useState("2026-10-15"),
    [availableFrom, setF] = useState("2026-10-20"),
    [availableTo, setT] = useState("2026-11-20"),
    [notes, setN] = useState("");
  return (
    <form
      className="card data-form"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({
          farmerId: user.id,
          crop,
          acres,
          harvestDate,
          availableFrom,
          availableTo,
          district,
          notes,
        });
      }}
    >
      <h1 className="text-2xl font-bold">{t("addResidue")}</h1>
      <label>
        {t("crop")}
        <select
          className="field"
          value={crop}
          onChange={(e) => setCrop(e.target.value as any)}
        >
          <option value="paddy">{t("paddy")}</option>
          <option value="wheat">{t("wheat")}</option>
        </select>
      </label>
      <label>
        {t("acres")}
        <input
          className="field"
          type="number"
          min="0.1"
          max="10000"
          step="0.1"
          required
          value={acres}
          onChange={(e) => setAcres(e.target.value)}
        />
      </label>
      <label>
        {t("harvestDate")}
        <input
          className="field"
          type="date"
          required
          value={harvestDate}
          onChange={(e) => setH(e.target.value)}
        />
      </label>
      <label>
        {t("availableFrom")}
        <input
          className="field"
          type="date"
          min={harvestDate}
          required
          value={availableFrom}
          onChange={(e) => setF(e.target.value)}
        />
      </label>
      <label>
        {t("availableTo")}
        <input
          className="field"
          type="date"
          min={availableFrom}
          required
          value={availableTo}
          onChange={(e) => setT(e.target.value)}
        />
      </label>
      <label>
        {t("district")}
        <select
          className="field"
          value={district}
          onChange={(e) => setDistrict(e.target.value)}
        >
          {LOCATIONS.map((x) => (
            <option key={x.district}>{x.district}</option>
          ))}
        </select>
      </label>
      <label>
        {t("notes")}
        <textarea
          className="field"
          maxLength={500}
          value={notes}
          onChange={(e) => setN(e.target.value)}
        />
      </label>
      <div className="flex gap-2 form-actions">
        <button type="button" className="secondary flex-1" onClick={onCancel}>
          ←
        </button>
        <button className="primary flex-1" disabled={busy || !acres}>
          {busy ? t("loading") : t("submit")}
        </button>
      </div>
    </form>
  );
}
function DemandForm({
  user,
  busy,
  t,
  onCancel,
  onSubmit,
}: {
  user: User;
  busy: boolean;
  t: (k: string) => string;
  onCancel: () => void;
  onSubmit: (b: any) => void;
}) {
  const [company, setC] = useState(user.name),
    [product, setP] = useState("pellets"),
    [acceptedResidues, setA] = useState<string[]>(["paddy", "wheat"]),
    [tonnesNeeded, setN] = useState("30"),
    [pricePerTonne, setPrice] = useState("1800"),
    [windowFrom, setF] = useState("2026-10-15"),
    [windowTo, setT] = useState("2026-11-30");
  const toggle = (x: string) =>
    setA(
      acceptedResidues.includes(x)
        ? acceptedResidues.filter((y) => y !== x)
        : [...acceptedResidues, x],
    );
  return (
    <form
      className="card data-form"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({
          buyerId: user.id,
          company,
          product,
          acceptedResidues,
          tonnesNeeded,
          pricePerTonne,
          windowFrom,
          windowTo,
        });
      }}
    >
      <h1 className="text-2xl font-bold">{t("postDemand")}</h1>
      <label>
        {t("company")}
        <input
          className="field"
          required
          maxLength={100}
          value={company}
          onChange={(e) => setC(e.target.value)}
        />
      </label>
      <label>
        {t("product")}
        <select
          className="field"
          value={product}
          onChange={(e) => setP(e.target.value)}
        >
          {[
            "pellets",
            "bioCNG",
            "compost",
            "biochar",
            "fodder",
            "cofiring",
          ].map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
      </label>
      <label>
        {t("crop")}
        <div className="mt-2 flex gap-4">
          {["paddy", "wheat"].map((x) => (
            <label key={x} className="m-0 flex gap-2">
              <input
                type="checkbox"
                checked={acceptedResidues.includes(x)}
                onChange={() => toggle(x)}
              />
              {t(x)}
            </label>
          ))}
        </div>
      </label>
      <label>
        {t("need")}
        <input
          className="field"
          type="number"
          min="0.1"
          required
          value={tonnesNeeded}
          onChange={(e) => setN(e.target.value)}
        />
      </label>
      <label>
        {t("price")}
        <input
          className="field"
          type="number"
          min="1"
          required
          value={pricePerTonne}
          onChange={(e) => setPrice(e.target.value)}
        />
      </label>
      <label>
        {t("availableFrom")}
        <input
          className="field"
          type="date"
          required
          value={windowFrom}
          onChange={(e) => setF(e.target.value)}
        />
      </label>
      <label>
        {t("availableTo")}
        <input
          className="field"
          type="date"
          min={windowFrom}
          required
          value={windowTo}
          onChange={(e) => setT(e.target.value)}
        />
      </label>
      <div className="flex gap-2 form-actions">
        <button type="button" className="secondary flex-1" onClick={onCancel}>
          ←
        </button>
        <button
          className="primary flex-1"
          disabled={busy || !acceptedResidues.length}
        >
          {busy ? t("loading") : t("submit")}
        </button>
      </div>
    </form>
  );
}
function Pickup({
  match,
  t,
  onChange,
}: {
  match?: Match;
  t: (k: string) => string;
  onChange: () => void;
}) {
  const [d, setD] = useState("2026-10-25"),
    [busy, setB] = useState(false);
  return match?.status === "pickup_scheduled" ||
    match?.status === "collected" ||
    match?.status === "paid" ? (
    <span className="chip">{t("status_" + match.status)}</span>
  ) : (
    <div className="flex items-center gap-1">
      <input
        aria-label={t("pickupDate")}
        type="date"
        className="rounded border p-1"
        value={d}
        onChange={(e) => setD(e.target.value)}
      />
      <button
        className="secondary !p-2"
        disabled={busy}
        onClick={async () => {
          if (match) {
            setB(true);
            await fetch("/api/matches/" + match.id, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ pickupDate: d }),
            });
            onChange();
            setB(false);
          } else {
            alert("Ask farmer to accept an offer first.");
          }
        }}
      >
        {t("confirmPickup")}
      </button>
    </div>
  );
}

