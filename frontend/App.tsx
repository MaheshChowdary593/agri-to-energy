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
    [offerSort, setOfferSort] = useState<"score" | "price" | "distance">("score"),
    [advice, setAdvice] = useState<{
      estimatedTonnes: number;
      bestUses: string[];
      tip: string;
    } | null>(null),
    [msg, setMsg] = useState(""),
    [busy, setBusy] = useState(false),
    [mobileNavOpen, setMobileNavOpen] = useState(false),
    [fresh, setFresh] = useState(0),
    [adminQuery, setAdminQuery] = useState(""),
    [adminStatus, setAdminStatus] = useState("all"),
    [showApprovalHistory, setShowApprovalHistory] = useState(false),
    [showOnboarding, setShowOnboarding] = useState(false),
    [profileCard, setProfileCard] = useState<any>(null),
    [resetCodes, setResetCodes] = useState<Record<string,string>>({});
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
  useEffect(() => {
    if (currentUser && typeof window !== "undefined" && !localStorage.getItem(`harvestloop-onboarding-${currentUser.role}`)) setShowOnboarding(true);
  }, [currentUser]);
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
    ),
    { data: approvalHistory, refresh: refreshApprovalHistory } = useApi<any[]>(
      "/api/admin/approvals/history?" + fresh,
    ),
    { data: adminUsers } = useApi<User[]>("/api/admin/users?" + fresh),
    { data: passwordResets, refresh: refreshPasswordResets } = useApi<any[]>("/api/admin/password-resets?" + fresh);
  const myListings = (listings ?? []).filter((x) => x.farmerId === user.id);
  const myDemands = (demands ?? []).filter((x) => x.buyerId === user.id);
  const adminVisibleListings = useMemo(() => {
    const query = adminQuery.trim().toLocaleLowerCase();
    return (listings ?? []).filter((listing) => {
      const owner = (adminUsers ?? seedUsers).find((candidate) => candidate.id === listing.farmerId);
      const matchesQuery = !query || [owner?.name, owner?.district, listing.crop, listing.notes].some(value => value?.toLocaleLowerCase().includes(query));
      return matchesQuery && (adminStatus === "all" || listing.status === adminStatus);
    });
  }, [listings, adminUsers, adminQuery, adminStatus]);
  const openProfile = async (id: string) => {
    try {
      const response = await fetch(`/api/profiles/${encodeURIComponent(id)}`);
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? t("error"));
      setProfileCard(result);
    } catch (error) {
      setMsg(error instanceof Error ? error.message : t("error"));
    }
  };
  const closeOnboarding = () => {
    if (currentUser && typeof window !== "undefined") localStorage.setItem(`harvestloop-onboarding-${currentUser.role}`, "done");
    setShowOnboarding(false);
  };
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
    <header className="site-header">
      <div className="header-inner">
        <button
          onClick={() => { setPage(currentUser ? role : "home"); setMobileNavOpen(false); }}
          className="brand-lockup"
          aria-label="HarvestLoop home"
        >
          <span className="brand-symbol" aria-hidden="true">H</span>
          <span className="brand-words"><b>HarvestLoop</b><small>Harvest value, kept local</small></span>
        </button>
        <button
          className="mobile-menu-toggle"
          type="button"
          aria-label={mobileNavOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={mobileNavOpen}
          onClick={() => setMobileNavOpen((open) => !open)}
        >
          <span></span><span></span><span></span>
        </button>
        <div className={`header-navigation ${mobileNavOpen ? "is-open" : ""}`}>
          <nav className="primary-nav" aria-label="Main navigation">
            {[
              ...(currentUser ? [{ label: "Dashboard", target: role }] : [{ label: "Home", target: "home" }]),
              { label: "About", target: "about" },
              { label: "Contact", target: "contact" },
            ].map((item) => (
              <button
                key={item.target}
                className={page === item.target ? "nav-link active" : "nav-link"}
                aria-current={page === item.target ? "page" : undefined}
                onClick={() => { setPage(item.target); setMobileNavOpen(false); setMsg(""); }}
              >
                {item.label}
              </button>
            ))}
          </nav>
          <div className="header-actions">
            <label className="sr-only" htmlFor="language-select">{t("language")}</label>
            <select
              id="language-select"
              className="language-select"
              value={lang}
              onChange={(e) => setLang(e.target.value as Language)}
              aria-label={t("language")}
            >
              <option value="en">EN</option>
              <option value="hi">हिंदी</option>
              <option value="pa">ਪੰਜਾਬੀ</option>
            </select>
            {currentUser ? (
              <div className="signed-in-user">
                <button className="header-profile-button" title={t("profileSettings")} onClick={() => { setPage("settings"); setMsg(""); setMobileNavOpen(false); }}>
                  <span className="user-avatar">{currentUser.name.slice(0, 1).toUpperCase()}</span>
                  <span className="header-user-name">{currentUser.name}</span>
                  <span className="header-profile-caret" aria-hidden="true">⌄</span>
                </button>
                <button
                  className="primary header-signout"
                  title="Sign out"
                  onClick={async () => {
                    await fetch("/api/auth/logout", { method: "POST" });
                    setCurrentUser(null);
                    setPage("home");
                    setMsg("");
                    setMobileNavOpen(false);
                  }}
                >
                  Log out <span aria-hidden="true">→</span>
                </button>
              </div>
            ) : (
              <button className="primary header-signin" onClick={() => { setPage("auth"); setMobileNavOpen(false); }}>
                Sign in <span aria-hidden="true">→</span>
              </button>
            )}
          </div>
        </div>
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
        {showOnboarding && currentUser && page !== "home" && page !== "auth" && (
          <section className="card onboarding-guide" aria-label={t("gettingStarted")}>
            <div><span className="section-kicker">{t("gettingStarted")}</span><h2>{t("welcomeName").replace("{name}", currentUser.name)}</h2><p>{t("onboardingIntro")}</p></div>
            <ol><li>{t("onboardingStepOne").replace("{role}", currentUser.role === "farmer" ? t("farmer") : currentUser.role === "buyer" ? t("buyer") : t("admin"))}</li><li>{t("onboardingStepTwo")}</li><li>{t("onboardingStepThree")}</li></ol>
            <button className="secondary onboarding-dismiss" onClick={closeOnboarding}>{t("gotIt")}</button>
          </section>
        )}
        {msg && page !== "auth" && (
          <div role="status" className="card border-amber-300 text-amber-900">
            {msg}
          </div>
        )}
        {children}
        {profileCard && <div className="profile-backdrop" role="presentation" onClick={() => setProfileCard(null)}><section className="card profile-dialog" role="dialog" aria-modal="true" aria-labelledby="profile-dialog-title" onClick={event => event.stopPropagation()}><button className="profile-close" aria-label={t("close")} onClick={() => setProfileCard(null)}>×</button><span className="section-kicker">{t("marketplaceProfile")}</span><h2 id="profile-dialog-title">{profileCard.name}</h2><p>{profileCard.role === "buyer" ? t("buyer") : t("farmer")} · {profileCard.district}, {profileCard.state}</p>{profileCard.businessApproved && <span className="verified-badge">✓ {t("businessApproved")}</span>}<dl><dt>{t("phone")}</dt><dd><a href={`tel:${profileCard.phone}`}>{profileCard.phone || t("notProvided")}</a></dd><dt>{t("village")}</dt><dd>{profileCard.village}</dd></dl><small>{t("contactSharedAfterMatch")}</small></section></div>}
      </div>
    </main>
  );
  if (page === "home")
    return frame(
      <LandingPage
        impact={impact}
        onStart={() => { setPage("auth"); setMsg(""); }}
        onAbout={() => setPage("about")}
      />,
    );
  if (page === "about")
    return frame(<AboutPage onStart={() => setPage(currentUser ? role : "auth")} />);
  if (page === "contact")
    return frame(<ContactPage />);
  if (page === "auth")
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
        onRecover={async (phone, password, recoveryKey) => {
          const result = await post("/api/auth/admin-recovery", { phone, password, recoveryKey });
          if (result?.ok) setMsg(t("adminPasswordReset"));
        }}
        onRequestAccountReset={async (phone) => {
          const result = await post("/api/auth/password-reset/request", { phone });
          if (result?.ok) setMsg(result.message);
          return Boolean(result?.ok);
        }}
        onCompleteAccountReset={async (phone, code, password) => {
          const result = await post("/api/auth/password-reset/complete", { phone, code, password });
          if (result?.ok) setMsg(t("passwordResetSuccess"));
          return Boolean(result?.ok);
        }}
      />,
    );
  if (page === "settings")
    return frame(
      <ProfileSettings
        user={currentUser ?? user}
        busy={busy}
        t={t}
        onCancel={() => { setPage(role); setMsg(""); }}
        onSubmit={async (profile) => {
          setBusy(true);
          setMsg("");
          try {
            const response = await fetch("/api/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(profile) });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error ?? t("error"));
            setCurrentUser(result.user);
            setFresh((value) => value + 1);
            setMsg(t("profileUpdated"));
            setPage(result.user.role);
          } catch (error) {
            setMsg(error instanceof Error ? error.message : t("error"));
          } finally {
            setBusy(false);
          }
        }}
        onChangePassword={async (currentPassword, newPassword) => {
          setBusy(true);
          setMsg("");
          try {
            const response = await fetch("/api/profile/password", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ currentPassword, newPassword }) });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error ?? t("error"));
            setMsg(t("passwordChanged"));
            setPage(role);
          } catch (error) {
            setMsg(error instanceof Error ? error.message : t("error"));
          } finally {
            setBusy(false);
          }
        }}
      />
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
        <section className="card profile-summary"><span className="user-avatar">{user.name.slice(0,1).toUpperCase()}</span><div><b>{user.name}</b><small>{user.phone} · {user.district}, {user.state}</small></div><span className="profile-privacy">{t("contactPrivateUntilMatch")}</span></section>
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
          myListings.map((l) => {
            const match = (matches ?? []).find(item => item.listingId === l.id);
            const demand = match && (demands ?? []).find(item => item.id === match.demandId);
            return <article key={l.id} className="card listing-card farmer-listing-item">
              <div className="flex justify-between"><b>{t(l.crop)} · {l.estimatedTonnes} t</b>{status(l.status)}</div>
              <div className="mt-2 text-sm text-slate-600">{l.acres} acres · {l.availableFrom}</div>
              <div className="farmer-listing-actions"><button className="secondary" onClick={() => goOffers(l)}>{t("offers")} →</button>{demand && <button className="profile-action" onClick={() => openProfile(demand.buyerId)}>{t("buyerProfile")}</button>}</div>
              {match && <MatchTimeline match={match} t={t} />}
            </article>;
          })
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
        <label className="card flex items-center justify-between gap-3 text-sm">Sort offers
          <select className="field" style={{ maxWidth: 190 }} value={offerSort} onChange={event => setOfferSort(event.target.value as "score" | "price" | "distance")}>
            <option value="score">Best match</option><option value="price">Highest price</option><option value="distance">Nearest pickup</option>
          </select>
        </label>
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
          [...offers].sort((a, b) => offerSort === "price" ? b.pricePerTonne - a.pricePerTonne : offerSort === "distance" ? a.distance - b.distance : b.score - a.score).map((o) => (
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
                {o.reasons.map((x) => (
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
  if (page === "buyer") {
    const totalRequested = myDemands.reduce((sum, demand) => sum + demand.tonnesNeeded, 0);
    const matchedSupply = myDemands.reduce((sum, demand) => {
      const committed = (matches ?? []).filter((match) => match.demandId === demand.id).reduce((tonnes, match) => {
        const listing = (listings ?? []).find((item) => item.id === match.listingId);
        return tonnes + (listing?.estimatedTonnes ?? 0);
      }, 0);
      return sum + Math.min(demand.tonnesNeeded, committed);
    }, 0);
    const stillNeeded = Math.max(0, totalRequested - matchedSupply);
    const matchProgress = totalRequested ? Math.min(100, (matchedSupply / totalRequested) * 100) : 0;
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
        <section className="card buyer-sourcing-card">
          <div className="buyer-sourcing-heading"><span className="buyer-sourcing-icon" aria-hidden="true">↗</span><div><span>{t("sourcingOverview")}</span><small>{user.district} · {user.state}</small></div></div>
          <div className="buyer-sourcing-total"><b>{totalRequested.toLocaleString("en-IN")}</b><span>{t("tonnesRequested")}</span></div>
          <div className="buyer-sourcing-progress"><div><span>{t("matchProgress")}</span><b>{Math.round(matchProgress)}%</b></div><div className="buyer-sourcing-track" role="meter" aria-label={t("matchProgress")} aria-valuemin={0} aria-valuemax={totalRequested || 1} aria-valuenow={matchedSupply}><i style={{ width: `${matchProgress}%` }}/></div></div>
          <div className="buyer-sourcing-breakdown">
            <div><span className="sourcing-dot sourcing-dot-matched"/><span>{t("matchedSupply")}</span><b>{matchedSupply.toLocaleString("en-IN")} t</b></div>
            <div><span className="sourcing-dot sourcing-dot-needed"/><span>{t("stillNeeded")}</span><b>{stillNeeded.toLocaleString("en-IN")} t</b></div>
          </div>
          <div className="buyer-sourcing-footer"><span className="verified-badge">✓ {t("businessApproved")}</span><span>{myDemands.length} {t(myDemands.length === 1 ? "activeRequests" : "activeRequestsPlural")}</span></div>
          {myDemands.length === 0 && <button className="buyer-sourcing-empty" onClick={() => setPage("demand")}>{t("startSourcing")} <span aria-hidden="true">→</span></button>}
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
            const matched = (listings ?? []).filter((l) => d.acceptedResidues.includes(l.crop) && (l.status === "open" || (matches ?? []).some(match => match.listingId === l.id && match.demandId === d.id)));
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
                      className="buyer-match-row"
                    >
                      <span className="buyer-match-copy">
                        {l.crop} · {l.estimatedTonnes} t ·{" "}
                        {(adminUsers ?? seedUsers).find((u) => u.id === l.farmerId)?.district ?? l.district}
                      </span>
                      <span className="buyer-match-actions">
                      <Pickup
                        match={(matches ?? []).find(
                          (m) => m.listingId === l.id && m.demandId === d.id,
                        )}
                        t={t}
                        onChange={() => setFresh((x) => x + 1)}
                      />
                      {(matches ?? []).some(match => match.listingId === l.id && match.demandId === d.id) && <button className="profile-action" onClick={() => openProfile(l.farmerId)}>{t("farmerProfile")}</button>}
                      </span>
                      {(matches ?? []).find(match => match.listingId === l.id && match.demandId === d.id) && <MatchTimeline match={(matches ?? []).find(match => match.listingId === l.id && match.demandId === d.id)!} t={t} />}
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
  }
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
          <span className="dashboard-eyebrow">HARVESTLOOP · OPERATIONS</span>
          <h1 className="text-2xl font-bold">
            {t("admin")} dashboard
          </h1>
          <p>
            Track the residue reaching new uses, review company requests, and
            keep pickups moving.
          </p>
          <span className="admin-live-status"><i /> Live programme overview</span>
        </div>
        {process.env.NODE_ENV !== "production" && <button
          className="secondary admin-reset"
          onClick={async () => {
            if (confirm("Reset all demo data?")) {
              await post("/api/reset", {});
              setFresh((x) => x + 1);
            }
          }}
        >
          <span aria-hidden="true">↺</span> {t("reset")}
        </button>}
      </section>
      <section className="card admin-approvals">
        <div className="admin-section-heading">
          <div><span className="admin-section-icon">✓</span><div><h2>Company approvals</h2><p>Review businesses before they join the marketplace.</p></div></div>
          <span className={`admin-count ${pendingCompanies?.length ? "has-pending" : ""}`}>{pendingCompanies?.length ?? "…"} pending</span>
        </div>
        <button className="admin-history-toggle" onClick={() => { setShowApprovalHistory(value => !value); if (!showApprovalHistory) void refreshApprovalHistory(); }} aria-expanded={showApprovalHistory}>{showApprovalHistory ? t("hideApprovalHistory") : t("viewApprovalHistory")} <span>{showApprovalHistory ? "↑" : "↓"}</span></button>
        {!pendingCompanies ? (
          <div className="admin-empty"><span className="admin-empty-icon">◌</span><span>Loading approval requests…</span></div>
        ) : pendingCompanies.length === 0 ? (
          <div className="admin-empty"><span className="admin-empty-icon">✓</span><span><b>All caught up</b><small>No companies are waiting for approval.</small></span></div>
        ) : (
          pendingCompanies.map((c) => (
            <div
              key={c.id}
              className="admin-approval-row"
            >
              <span className="admin-company-avatar">{c.name.slice(0,1).toUpperCase()}</span>
              <span className="admin-company-info"><b>{c.name}</b><small>{c.district} · Company account</small></span>
              <button
                className="primary admin-approve-button"
                onClick={async () => {
                  const r = await fetch("/api/admin/approvals", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ userId: c.id }),
                  });
                  if (r.ok) {
                    await refreshPending();
                    await refreshApprovalHistory();
                    setMsg("Company approved.");
                  }
                }}
              >
                Approve company <span aria-hidden="true">→</span>
              </button>
            </div>
          ))
        )}
        {showApprovalHistory && <div className="approval-history"><h3>{t("recentApprovals")}</h3>{!approvalHistory ? <p>{t("loading")}</p> : approvalHistory.length === 0 ? <p>{t("noApprovalHistory")}</p> : approvalHistory.slice(0, 8).map((record: any) => <div className="approval-history-row" key={record.user.id}><span className="admin-company-avatar">✓</span><span><b>{record.user.name}</b><small>{record.user.district} · {record.approvedAt ? new Date(record.approvedAt).toLocaleDateString(lang === "hi" ? "hi-IN" : lang === "pa" ? "pa-IN" : "en-IN") : t("approvalDateUnavailable")}</small></span><button className="profile-action" onClick={() => openProfile(record.user.id)}>{t("profile")}</button></div>)}</div>}
      </section>
      <section className="card admin-approvals">
        <div className="admin-section-heading"><div><span className="admin-section-icon">⌑</span><div><h2>{t("passwordResetRequests")}</h2><p>{t("confirmUserPhone")}</p></div></div></div>
        {!passwordResets ? <p>{t("loading")}</p> : passwordResets.length === 0 ? <div className="admin-empty"><span className="admin-empty-icon">✓</span><span>{t("noPasswordResetRequests")}</span></div> : passwordResets.map((request:any) => <div className="admin-approval-row" key={request.id}><span className="admin-company-avatar">↻</span><span className="admin-company-info"><b>{request.userName}</b><small>{request.phone} · {new Date(request.requestedAt).toLocaleString()}</small></span><button className="primary admin-approve-button" onClick={async()=>{if(!confirm(t("confirmUserPhone")))return;const response=await fetch("/api/admin/password-resets",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({requestId:request.id})});const result=await response.json();if(response.ok){setResetCodes(codes=>({...codes,[request.id]:result.code}));await refreshPasswordResets();}else setMsg(result.error??t("error"));}}>{t(request.status==="issued"?"issueNewCode":"verifyAndIssueCode")}</button>{resetCodes[request.id]&&<div className="password-reset-code"><code>{resetCodes[request.id]}</code><button className="profile-action" onClick={()=>void navigator.clipboard?.writeText(resetCodes[request.id])}>{t("copyCode")}</button><small>{t("resetCodeExpires")}</small></div>}</div>)}
      </section>
      <div className="grid grid-cols-2 gap-3 admin-kpis">
        {[
          ["↗", t("totalTonnes"), `${impact?.tonnes ?? 0} t`, "Residue collected or paid"],
          ["◉", t("co2"), `${(impact?.co2Avoided ?? 0).toFixed(1)} t`, "Estimated emissions avoided"],
          [
            "₹",
            t("rupees"),
            `₹${(impact?.rupeesPaid ?? 0).toLocaleString("en-IN")}`,
            "Value returned to farmers",
          ],
          ["♧", t("farmers"), impact?.farmers ?? 0, "Registered on HarvestLoop"],
          ["▦", t("companies"), impact?.companies ?? 0, "Marketplace buyers"],
        ].map(([icon, label, value, note]) => (
          <div className="card admin-kpi-card" key={String(label)}>
            <div className="admin-kpi-top"><span className="admin-kpi-icon">{icon}</span><span className="admin-kpi-label">{label}</span></div>
            <b>{value}</b>
            <small>{note}</small>
          </div>
        ))}
      </div>
      <section className="card admin-districts">
        <div className="admin-section-heading"><div><span className="admin-section-icon">⌖</span><div><h2>{t("districtBreakdown")}</h2><p>Collected residue across active regions.</p></div></div></div>
        {(() => {
          const districts = Object.entries(impact?.byDistrict ?? {}) as [string, number][];
          const max = Math.max(1, ...districts.map(([, tonnes]) => tonnes));
          return districts.length ? districts.sort((a, b) => b[1] - a[1]).map(([district, tonnes]) => (
            <div className="admin-district-row" key={district}>
              <div><span>{district}</span><b>{tonnes.toFixed(1)} <small>t</small></b></div>
              <div className="admin-meter"><i style={{ width: `${Math.max(4, tonnes / max * 100)}%` }} /></div>
            </div>
          )) : <div className="admin-empty"><span className="admin-empty-icon">⌖</span><span><b>No district activity yet</b><small>Collected residue will appear here.</small></span></div>;
        })()}
      </section>
      <section className="card admin-listings">
        <div className="admin-section-heading"><div><span className="admin-section-icon">▤</span><div><h2>Residue listings</h2><p>Monitor supply and update pickup progress.</p></div></div><span className="admin-listing-total">{listings?.length ?? 0} total</span></div>
        <div className="admin-listing-filters"><label className="admin-search"><span aria-hidden="true">⌕</span><input aria-label={t("searchListings")} placeholder={t("searchListings")} value={adminQuery} onChange={event => setAdminQuery(event.target.value)} /></label><label><span className="sr-only">{t("filterStatus")}</span><select value={adminStatus} onChange={event => setAdminStatus(event.target.value)}><option value="all">{t("allStatuses")}</option>{["open","matched","pickup_scheduled","collected","paid"].map(value => <option value={value} key={value}>{t(`status_${value}`)}</option>)}</select></label></div>
        {ll ? (
          <p>{t("loading")}</p>
        ) : le ? (
          <p>{t("error")}</p>
        ) : (
          adminVisibleListings.map((l) => {
            const owner = (adminUsers ?? seedUsers).find((candidate) => candidate.id === l.farmerId);
            const listingMatches = (matches ?? []).filter((match) => match.listingId === l.id);
            return (
            <div key={l.id} className="admin-listing-row">
              <div className="admin-listing-main">
                <span className="admin-listing-icon">{l.crop === "wheat" ? "✳" : "❋"}</span>
                <div className="admin-listing-copy"><b>{owner?.name ?? t("farmer")}</b><small>{l.crop} · {l.estimatedTonnes} tonnes · {owner?.district ?? l.district ?? t("districtNotSet")}</small></div>
                {status(l.status)}
                {owner && <button className="profile-action" onClick={() => openProfile(owner.id)}>{t("profile")}</button>}
              </div>
              {listingMatches.map((m) => (
                  <div key={m.id} className="admin-match-row">
                    <span className="admin-match-id">{t("match")} {m.id.slice(0, 8)} · ₹{m.agreedPricePerTonne.toLocaleString("en-IN")}/{t("perTonne")}</span>
                    {demands?.find(demand => demand.id === m.demandId) && <button className="profile-action" onClick={() => openProfile(demands.find(demand => demand.id === m.demandId)!.buyerId)}>{t("buyerProfile")}</button>}
                    {m.status === "pickup_scheduled" && (
                      <button
                        className="secondary admin-action-button"
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
                        className="secondary admin-action-button"
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
                    <MatchTimeline match={m} t={t} />
                  </div>
                ))}
            </div>
          )})
        )}
        {!ll && !le && adminVisibleListings.length === 0 && <div className="admin-empty"><span className="admin-empty-icon">⌕</span><span><b>{t("noListingResults")}</b><small>{t("adjustFilters")}</small></span></div>}
      </section>
    </>,
  );
}
function MatchTimeline({match,t}:{match:Match;t:(key:string)=>string}){
 const stages:Match["status"][]=["matched","pickup_scheduled","collected","paid"];
 const current=stages.indexOf(match.status);
 return <ol className="status-timeline" aria-label={t("pickupTimeline")}>{stages.map((stage,index)=>{const event=[...(match.statusHistory??[])].reverse().find(item=>item.status===stage);return <li className={index<=current?"is-complete":""} key={stage}><i aria-hidden="true"/><span><b>{t(`status_${stage}`)}</b><small>{event?new Date(event.at).toLocaleDateString():index===current?t("statusRecordedLegacy"):t("notStarted")}</small></span></li>;})}</ol>;
}
function LandingPage({
  impact,
  onStart,
  onAbout,
}: {
  impact: any;
  onStart: () => void;
  onAbout: () => void;
}) {
  return (
    <div className="public-page landing-page">
      <section className="landing-hero">
        <div className="landing-copy">
          <span className="eyebrow-pill"><span></span> A LOCAL MARKETPLACE FOR CROP RESIDUE</span>
          <h1>Good for your farm.<br /><em>Better for the future.</em></h1>
          <p>HarvestLoop connects farmers with nearby buyers so leftover crop residue can become a valuable resource instead of going to waste.</p>
          <div className="landing-actions">
            <button className="primary landing-primary" onClick={onStart}>Get started <span aria-hidden="true">→</span></button>
            <button className="text-action" onClick={onAbout}>See how it works <span aria-hidden="true">↗</span></button>
          </div>
          <div className="landing-proof"><div className="proof-avatars"><span>F</span><span>B</span><span>↗</span></div><span>Farmers and buyers, working in the same loop</span></div>
        </div>
        <div className="landing-art" aria-label="A preview of the HarvestLoop crop residue marketplace" role="img">
          <div className="art-sun"></div><div className="art-field art-field-back"></div><div className="art-field art-field-front"></div>
          <div className="market-preview">
            <div className="preview-head"><span className="preview-mark">K</span><span><b>Residue marketplace</b><small>Opportunities near you</small></span><span className="preview-live">LIVE</span></div>
            <div className="preview-listing"><span className="preview-crop">🌾</span><span><b>Paddy straw</b><small>Available · 12.5 tonnes</small></span><strong>₹1,800<small>/ tonne</small></strong></div>
            <div className="preview-listing"><span className="preview-crop wheat">🌿</span><span><b>Wheat residue</b><small>Nearby buyer match</small></span><span className="match-score">92%<small>match</small></span></div>
            <div className="preview-footer"><span><i></i> Built around your district</span><span>→</span></div>
          </div>
          <div className="art-note"><span>♻</span><span><b>Waste to worth</b><small>Keep resources moving</small></span></div>
        </div>
      </section>
      <section className="impact-strip" aria-label="HarvestLoop community impact">
        <div><strong>{impact?.farmers ?? "—"}</strong><span>Farmers connected</span></div>
        <div><strong>{impact?.companies ?? "—"}</strong><span>Buyers on the loop</span></div>
        <div><strong>{impact?.tonnes ?? "—"} t</strong><span>Residue listed</span></div>
        <div><strong>{Number(impact?.co2Avoided ?? 0).toFixed(1)} t</strong><span>Estimated CO₂ avoided</span></div>
      </section>
      <section className="how-section">
        <div className="section-intro"><span className="section-kicker">A SIMPLE, LOCAL LOOP</span><h2>From leftover to opportunity</h2><p>Every step is designed to make residue easier to find, price, and put to use.</p></div>
        <div className="how-grid">
          <article className="how-card"><span className="step-number">01</span><div className="how-icon">🌾</div><h3>List your residue</h3><p>Farmers share crop type, quantity, and when it will be ready.</p></article>
          <article className="how-card"><span className="step-number">02</span><div className="how-icon">⌕</div><h3>Find a nearby match</h3><p>Buyers discover local supply that fits their needs and timing.</p></article>
          <article className="how-card"><span className="step-number">03</span><div className="how-icon">↗</div><h3>Move it to good use</h3><p>Coordinate collection and keep useful biomass in circulation.</p></article>
        </div>
      </section>
      <section className="landing-cta"><div><span className="section-kicker">START WITH YOUR NEXT HARVEST</span><h2>Make crop residue count.</h2><p>Join the local network connecting agricultural supply with real demand.</p></div><button className="primary" onClick={onStart}>Create your account <span aria-hidden="true">→</span></button></section>
      <PublicFooter onAbout={onAbout} />
    </div>
  );
}
function AboutPage({ onStart }: { onStart: () => void }) {
  return (
    <div className="public-page info-page">
      <section className="info-hero">
        <span className="section-kicker">ABOUT HARVESTLOOP</span>
        <h1>Turning a seasonal challenge into a shared opportunity.</h1>
        <p>When crop residue has a clear destination, farmers and local businesses can both benefit. HarvestLoop helps them find each other and make the next step easier.</p>
      </section>
      <section className="about-story">
        <div className="story-mark">H</div>
        <div><span className="section-kicker">WHY WE EXIST</span><h2>Keep value close to where it grows.</h2><p>Crop residue is a resource with many possible uses. HarvestLoop brings local supply and buyer demand together in one place, helping communities move biomass toward useful products like compost, biofuel, and more.</p><p>Our goal is a practical one: make it easier to find a match, agree on the details, and coordinate collection.</p></div>
      </section>
      <section className="value-grid">
        <article className="value-card"><span>01</span><h3>Local by design</h3><p>Connections begin with nearby farmers, buyers, and collection windows.</p></article>
        <article className="value-card"><span>02</span><h3>Clear expectations</h3><p>Crop, quantity, timing, and price stay visible while partners coordinate.</p></article>
        <article className="value-card"><span>03</span><h3>Useful outcomes</h3><p>Help residue reach businesses that can turn it into something useful.</p></article>
      </section>
      <section className="landing-cta"><div><span className="section-kicker">BE PART OF THE LOOP</span><h2>Let’s make the next match.</h2><p>Sign in or create an account to get started.</p></div><button className="primary" onClick={onStart}>Get started <span aria-hidden="true">→</span></button></section>
      <PublicFooter />
    </div>
  );
}
function ContactPage() {
  const email = process.env.NEXT_PUBLIC_CONTACT_EMAIL;
  return (
    <div className="public-page info-page contact-page">
      <section className="info-hero contact-hero">
        <span className="section-kicker">CONTACT</span>
        <h1>We’re here to help you keep things moving.</h1>
        <p>Questions about a listing, a match, or your account? Choose the support path that fits your situation.</p>
      </section>
      <section className="contact-grid">
        <article className="contact-card"><span className="contact-icon">✉</span><span className="section-kicker">GENERAL SUPPORT</span><h2>Talk to the HarvestLoop team</h2>{email ? <><p>Send us a note and include your district and account type so we can help faster.</p><a className="contact-link" href={`mailto:${email}?subject=HarvestLoop%20support`}>Email support <span aria-hidden="true">→</span></a></> : <><p>Direct support email has not been configured for this deployment yet.</p><small>For help with your account, contact the administrator who invited you.</small></>}</article>
        <article className="contact-card contact-secondary"><span className="contact-icon">◎</span><span className="section-kicker">ACCOUNT APPROVAL</span><h2>Waiting for company approval?</h2><p>Company accounts need an administrator to approve them before sign-in. Your account details remain saved while you wait.</p><div className="contact-note">Tip: include your company name and registered phone number when asking about approval.</div></article>
        <article className="contact-card contact-secondary"><span className="contact-icon">⌖</span><span className="section-kicker">MARKETPLACE HELP</span><h2>Need help with a listing?</h2><p>Have your crop type, quantity, district, and listing status ready. These details help the team understand the issue quickly.</p></article>
      </section>
      <PublicFooter />
    </div>
  );
}
function PublicFooter({ onAbout }: { onAbout?: () => void }) {
  return <footer className="public-footer"><span>© {new Date().getFullYear()} HarvestLoop</span><span>Keep harvest value moving locally.</span>{onAbout && <button onClick={onAbout}>About HarvestLoop</button>}</footer>;
}
function LoginView({
  lang,
  busy,
  message,
  onSignIn,
  onRegister,
  onRecover,
  onRequestAccountReset,
  onCompleteAccountReset,
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
  onRecover:(phone:string,password:string,recoveryKey:string)=>Promise<void>;
  onRequestAccountReset:(phone:string)=>Promise<boolean>;
  onCompleteAccountReset:(phone:string,code:string,password:string)=>Promise<boolean>;
}) {
  const [mode, setMode] = useState<"login" | "register" | "recover">("login"),
    [kind, setKind] = useState<"farmer" | "buyer">("farmer"),
    [name, setName] = useState(""),
    [phone, setPhone] = useState(""),
    [password, setPassword] = useState(""),
    [recoveryKey, setRecoveryKey] = useState(""),
    [recoveryCode, setRecoveryCode] = useState(""),
    [confirmResetPassword, setConfirmResetPassword] = useState(""),
    [recoveryError, setRecoveryError] = useState(""),
    [recoveryKind, setRecoveryKind] = useState<"account"|"admin">("account"),
    [resetRequested, setResetRequested] = useState(false),
    [district, setDistrict] = useState("Ludhiana");
  const title =
    lang === "hi"
      ? "हार्वेस्टलूप में साइन इन करें"
      : lang === "pa"
        ? "ਹਾਰਵੈਸਟਲੂਪ ਵਿੱਚ ਸਾਈਨ ਇਨ ਕਰੋ"
        : "Sign in to HarvestLoop";
  return (
    <div className="login-layout">
      <section className="welcome-panel">
        <div className="welcome-kicker"><span className="welcome-icon">🌾</span> GROW · GATHER · REUSE</div>
        <h1>{title}</h1>
        <p className="welcome-copy">{tr(lang, "intro")}</p>
        <div className="welcome-benefits" aria-label="HarvestLoop benefits">
          <div><span>01</span><p><b>Find nearby partners</b><small>Connect with farmers and buyers in your district.</small></p></div>
          <div><span>02</span><p><b>Make residue valuable</b><small>Turn leftover crop material into a useful resource.</small></p></div>
          <div><span>03</span><p><b>Keep it simple</b><small>Manage listings and offers from one place.</small></p></div>
        </div>
        <div className="welcome-footer"><span className="live-dot" /> A better loop for every harvest</div>
      </section>
      <section className="card auth-card">
        <div className="auth-heading">
          <span className="auth-eyebrow">YOUR HARVESTLOOP ACCOUNT</span>
          <h2>{mode === "login" ? "Welcome back" : mode === "recover" ? tr(lang,"forgotAdminPassword") : "Join the community"}</h2>
          <p>{mode === "login" ? "Sign in to continue to your workspace." : mode === "recover" ? tr(lang,"recoveryInstructions") : "Create an account to get started."}</p>
        </div>
        {mode !== "recover" && <div className="mb-4 flex gap-2">
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
        </div>}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (mode === "login") void onSignIn(phone, password);
            else if(mode === "recover") {
              setRecoveryError("");
              if(recoveryKind === "admin") void onRecover(phone,password,recoveryKey);
              else if(resetRequested) {
                if(password!==confirmResetPassword){setRecoveryError(tr(lang,"passwordMismatch"));return;}
                void onCompleteAccountReset(phone,recoveryCode,password).then(ok=>{if(ok){setMode("login");setPassword("");setConfirmResetPassword("");setRecoveryCode("");setResetRequested(false);}});
              } else void onRequestAccountReset(phone).then(ok=>{if(ok)setResetRequested(true);});
            }
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
          {mode === "recover" && <div className="recovery-kind-switch" role="group" aria-label={tr(lang,"recoveryInstructions")}><button type="button" className={recoveryKind === "account" ? "primary" : "secondary"} onClick={()=>{setRecoveryKind("account");setResetRequested(false);setRecoveryCode("");setPassword("");}}>{tr(lang,"accountRecovery")}</button><button type="button" className={recoveryKind === "admin" ? "primary" : "secondary"} onClick={()=>{setRecoveryKind("admin");setResetRequested(false);setRecoveryCode("");setPassword("");}}>{tr(lang,"adminRecovery")}</button></div>}
          <label>
            Phone number
            <input
              className="field"
              type="tel"
              autoComplete="tel"
              required
              minLength={8}
              value={phone}
              onChange={(e) => { setPhone(e.target.value); if(mode === "recover") {setResetRequested(false);setPassword("");setConfirmResetPassword("");setRecoveryCode("");} }}
            />
          </label>
          {(mode === "login" || (mode === "recover" && (recoveryKind === "admin" || resetRequested))) && <label>
            {mode === "login" ? tr(lang,"password") : tr(lang,"newPassword")}
            <input className="field" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} required minLength={mode === "login" ? 6 : 8} value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>}
          {mode === "recover" && recoveryKind === "admin" && <label>{tr(lang,"recoveryKey")}<input className="field" type="password" autoComplete="off" required value={recoveryKey} onChange={event=>setRecoveryKey(event.target.value)} /></label>}
          {mode === "recover" && recoveryKind === "account" && resetRequested && <><label>{tr(lang,"resetCode")}<input className="field" autoComplete="one-time-code" required minLength={8} maxLength={8} value={recoveryCode} onChange={event=>setRecoveryCode(event.target.value.toUpperCase())} /><small>{tr(lang,"enterResetCode")}</small></label><label>{tr(lang,"confirmPassword")}<input className="field" type="password" autoComplete="new-password" required minLength={8} value={confirmResetPassword} onChange={event=>setConfirmResetPassword(event.target.value)} /></label><p className="recovery-help">{tr(lang,"requestReviewNotice")}</p></>}
          {recoveryError && <p className="password-form-error" role="alert">{recoveryError}</p>}
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
              : mode === "recover" ? recoveryKind === "admin" ? tr(lang,"resetAdminPassword") : resetRequested ? tr(lang,"setPassword") : tr(lang,"requestResetCode") : kind === "farmer"
                  ? "Create farmer account"
                  : "Request company account"}
          </button>
        </form>
        {mode === "login" && <button className="recovery-link" type="button" onClick={()=>{setMode("recover");setRecoveryKind("account");setResetRequested(false);setRecoveryCode("");setPassword("");}}>{tr(lang,"forgotAdminPassword")}</button>}
        {mode !== "login" && <button className="recovery-link" type="button" onClick={()=>setMode("login")}>{tr(lang,"backToSignIn")}</button>}
        {mode === "login" && (
          <div className="demo-credentials mt-4 rounded-lg p-3 text-sm">
            <b>Exploring the demo?</b>
            <p>Use a demo account to preview a farmer, buyer, or admin workspace.</p>
            <details>
              <summary>Show demo sign-in details</summary>
              <div className="demo-details">
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
function ProfileSettings({
  user,
  busy,
  t,
  onCancel,
  onSubmit,
  onChangePassword,
}: {
  user: User;
  busy: boolean;
  t: (key: string) => string;
  onCancel: () => void;
  onSubmit: (profile: { name: string; phone: string; village: string }) => void;
  onChangePassword: (currentPassword: string, newPassword: string) => void;
}) {
  const [name, setName] = useState(user.name),
    [phone, setPhone] = useState(user.phone),
    [village, setVillage] = useState(user.village),
    [currentPassword, setCurrentPassword] = useState(""),
    [newPassword, setNewPassword] = useState(""),
    [confirmPassword, setConfirmPassword] = useState(""),
    [passwordError, setPasswordError] = useState("");
  return (
    <section className="card profile-settings-card">
      <div className="profile-settings-heading">
        <span className="user-avatar profile-settings-avatar">{name.slice(0, 1).toUpperCase()}</span>
        <div><span className="section-kicker">{t("profileSettings")}</span><h1>{t("editProfile")}</h1><p>{user.district}, {user.state}</p></div>
      </div>
      <form className="profile-settings-form" onSubmit={(event) => { event.preventDefault(); onSubmit({ name, phone, village }); }}>
        <label>{t("name")}<input className="field" autoComplete="name" required minLength={2} maxLength={100} value={name} onChange={(event) => setName(event.target.value)} /></label>
        <label>{t("phone")}<input className="field" type="tel" inputMode="tel" autoComplete="tel" required minLength={8} maxLength={20} value={phone} onChange={(event) => setPhone(event.target.value)} /><small>{t("phoneUsedToSignIn")}</small></label>
        <label>{t("village")}<input className="field" autoComplete="address-level2" required minLength={2} maxLength={100} value={village} onChange={(event) => setVillage(event.target.value)} /></label>
        <div className="profile-settings-actions"><button type="button" className="secondary" onClick={onCancel}>{t("cancel")}</button><button className="primary" disabled={busy}>{busy ? t("savingChanges") : t("saveChanges")}</button></div>
      </form>
      <section className="change-password-section">
        <div><h2>{t("changePassword")}</h2><p>{t("passwordChangeHint")}</p></div>
        <form className="profile-settings-form" onSubmit={(event) => { event.preventDefault(); setPasswordError(""); if (newPassword !== confirmPassword) { setPasswordError(t("passwordMismatch")); return; } onChangePassword(currentPassword, newPassword); }}>
          <label>{t("currentPassword")}<input className="field" type="password" autoComplete="current-password" required value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} /></label>
          <div className="profile-password-grid"><label>{t("newPassword")}<input className="field" type="password" autoComplete="new-password" required minLength={8} maxLength={128} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} /></label><label>{t("confirmPassword")}<input className="field" type="password" autoComplete="new-password" required minLength={8} maxLength={128} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} /></label></div>
          {passwordError && <p className="password-form-error" role="alert">{passwordError}</p>}
          <div className="profile-settings-actions"><button className="primary" disabled={busy}>{busy ? t("savingChanges") : t("changePassword")}</button></div>
        </form>
      </section>
    </section>
  );
}

function dateOffset(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
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
    [harvestDate, setH] = useState(() => dateOffset(5)),
    [availableFrom, setF] = useState(() => dateOffset(7)),
    [availableTo, setT] = useState(() => dateOffset(37)),
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

