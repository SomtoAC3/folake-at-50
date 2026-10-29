import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MapPin, Clock, Shirt, Bell, Sparkles, ArrowRight, Plane, Users, Phone, Music } from "lucide-react";
import { COLORS, F, CAPS, DISPLAY_LUXE } from "../../shared/theme";
import { Card, Eyebrow, SectionTitle, GoldButton, Badge, LintelDivider } from "../../shared/ui";
import { useAuth } from "../../lib/auth";
import { fetchItinerary, fetchAnnouncements, fetchSiteContent } from "../../lib/queries";

const FALLBACK_WELCOME_NOTE =
  "Dear Guests,\n\nFifty is a milestone. Celebrating it with Folake on this Egypt Escape is a rare gift. Thank you for making the journey, for showing up with love, and for choosing to make these memories evergreen. Here's to the sea, the laughter, the dancing, and a few golden days in Sharm we'll never forget. See you by the Red Sea.";

// Collaborative Spotify playlist for the trip. It is private, so Spotify will
// not embed it; the invite link (with its pt/pi parameters) lets guests open
// it, join and add songs.
const PLAYLIST_INVITE_URL =
  "https://open.spotify.com/playlist/06EWZXbWmQP6ioUeBIb1ZS?si=0fsz5LJHT2OlLnf9uqMPtw&pi=rjT01OXHSi2Rg&pt=855e6194bcd91adfe67302087f6a0b64";

// Spotify's mark in its brand green, so guests know the playlist opens there.
function SpotifyLogo({ size = 24, className = "" }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} role="img" aria-label="Spotify">
      <path
        fill="#1ED760"
        d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"
      />
    </svg>
  );
}

// Built-in hero slideshow. Photos live in public/landmarks/ (Wikimedia
// Commons, credited on the More page).
const LANDMARKS = [
  { src: "/landmarks/naama-bay.jpg", name: "Naama Bay", place: "Sharm El Sheikh" },
  { src: "/landmarks/soho-square.jpg", name: "SOHO Square", place: "Sharm El Sheikh" },
  { src: "/landmarks/dancing-fountain.jpg", name: "Dancing Fountain", place: "SOHO Square" },
  { src: "/landmarks/al-mustafa-mosque.jpg", name: "Al Mustafa Mosque", place: "Sharm El Sheikh" },
  { src: "/landmarks/heavenly-cathedral.jpg", name: "The Heavenly Cathedral", place: "Sharm El Sheikh" },
  { src: "/landmarks/sharks-bay.jpg", name: "Sharks Bay", place: "Sharm El Sheikh" },
  { src: "/landmarks/al-sahaba-mosque.jpg", name: "Al Sahaba Mosque", place: "Old Market" },
  { src: "/landmarks/ras-mohammed.jpg", name: "Ras Mohammed", place: "National Park" },
];

function LandmarkSlideshow() {
  const [index, setIndex] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const onChange = (e) => setReducedMotion(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setIndex((i) => (i + 1) % LANDMARKS.length), 4200);
    return () => clearInterval(t);
  }, []);

  const current = LANDMARKS[index];
  return (
    <div
      className="relative w-full overflow-hidden rounded-[3px] mb-10"
      style={{ height: 230, background: COLORS.chip }}
    >
      {LANDMARKS.map((l, i) => (
        <img
          key={l.src}
          src={l.src}
          alt={i === index ? `${l.name}, ${l.place}` : ""}
          className="absolute inset-0 w-full h-full object-cover"
          loading={i === 0 ? "eager" : "lazy"}
          style={{
            opacity: i === index ? 1 : 0,
            transition: reducedMotion ? "none" : "opacity 0.9s ease",
          }}
        />
      ))}
      <div
        className="absolute left-3 bottom-3 px-2.5 py-1.5 rounded-[2px] text-[9.5px] font-semibold"
        style={{ background: "rgba(251,250,248,0.94)", color: "#0F0E0D", ...CAPS, letterSpacing: "0.16em" }}
      >
        {current.name} <span style={{ color: "#6F6A62", fontWeight: 500 }}>· {current.place}</span>
      </div>
      <div className="absolute right-3 bottom-3.5 flex gap-1.5" aria-hidden="true">
        {LANDMARKS.map((l, i) => (
          <span
            key={l.src}
            className="w-[5px] h-[5px] rounded-full"
            style={{ background: i === index ? "#FFFFFF" : "rgba(255,255,255,0.55)" }}
          />
        ))}
      </div>
    </div>
  );
}

const DAY_MS = 86400000;

function dayStart(dateStr) {
  return new Date(`${dateStr}T00:00:00`);
}

// "3:00 PM" on a given day -> Date; null when the time isn't a real time
// (e.g. "—" or "TBC"), so callers can treat it as still upcoming.
function parseTimeOn(dateStr, timeStr) {
  const m = /(\d{1,2}):(\d{2})\s*(AM|PM)/i.exec(timeStr || "");
  if (!m) return null;
  let h = parseInt(m[1], 10) % 12;
  if (/pm/i.test(m[3])) h += 12;
  return new Date(`${dateStr}T${String(h).padStart(2, "0")}:${m[2]}:00`);
}

function tripStatus(days, now) {
  if (!days?.length) return null;
  const total = days.length;
  const first = dayStart(days[0].date);
  const lastEnd = new Date(dayStart(days[total - 1].date).getTime() + DAY_MS);
  if (now < first) return { phase: "before", dayNum: 0, total };
  if (now >= lastEnd) return { phase: "after", dayNum: total, total };
  const idx = days.findIndex((d) => {
    const s = dayStart(d.date);
    return now >= s && now < new Date(s.getTime() + DAY_MS);
  });
  return {
    phase: "during",
    dayNum: idx >= 0 ? idx + 1 : Math.min(total, Math.floor((now - first) / DAY_MS) + 1),
    total,
    today: idx >= 0 ? days[idx] : null,
  };
}

// First activity that hasn't ended yet, scanning forward from today.
function findNextActivity(days, now) {
  for (const day of days) {
    if (new Date(dayStart(day.date).getTime() + DAY_MS) <= now) continue;
    for (const act of day.activities) {
      const ends = parseTimeOn(day.date, act.end_time) || parseTimeOn(day.date, act.start_time);
      if (!ends || ends >= now) return act;
    }
  }
  return null;
}

function formatDateRange(days) {
  const first = dayStart(days[0].date);
  const last = dayStart(days[days.length - 1].date);
  const fmt = (d) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const cities = [...new Set(days.map((d) => d.city))].join(" & ");
  return `${fmt(first)} – ${fmt(last)}, ${last.getFullYear()}${cities ? ` · ${cities}` : ""}`;
}

function formatLongDateRange(days) {
  const first = dayStart(days[0].date);
  const last = dayStart(days[days.length - 1].date);
  const fmt = (d) => d.toLocaleDateString("en-GB", { day: "numeric", month: "long" });
  return `${fmt(first)} – ${fmt(last)} ${last.getFullYear()}`;
}

function Hero() {
  return (
    <div className="relative w-full overflow-hidden" style={{ aspectRatio: "4 / 5", background: "#E8E7E4" }}>
      <img
        src="/hero/folake.jpg"
        alt="Folake in a black wide-brim hat and turtleneck"
        className="hero-photo absolute inset-0 w-full h-full object-cover"
        style={{ objectPosition: "50% 18%" }}
        fetchpriority="high"
      />
      {/* Sits on the photo's pale studio backdrop, so it stays ink in both themes. */}
      <div
        className="absolute right-3 top-5 text-[9px] font-semibold"
        style={{ writingMode: "vertical-rl", color: "rgba(15,14,13,0.72)", fontFamily: F.body, ...CAPS, letterSpacing: "0.36em" }}
        aria-hidden="true"
      >
        Sharm El Sheikh · MMXXVI
      </div>
    </div>
  );
}

export default function Home() {
  const { configured } = useAuth();
  const [days, setDays] = useState(null);
  const [latestUpdate, setLatestUpdate] = useState(null);
  const [welcomeNote, setWelcomeNote] = useState(FALLBACK_WELCOME_NOTE);
  const navigate = useNavigate();

  useEffect(() => {
    if (!configured) return;
    let active = true;
    fetchItinerary()
      .then((d) => active && setDays(d))
      .catch(() => {});
    fetchAnnouncements()
      .then((list) => active && setLatestUpdate(list[0] ?? null))
      .catch(() => {});
    fetchSiteContent("welcome_note")
      .then((value) => {
        if (active && value) setWelcomeNote(value);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [configured]);

  const now = new Date();
  const status = tripStatus(days, now);
  const nextActivity = days ? findNextActivity(days, now) : null;

  return (
    <div>
      <Hero />

      <div className="px-6 pt-9 pb-12">
        <div className="rise-in">
          <Eyebrow>A Golden Jubilee · The Red Sea</Eyebrow>
          <h1 className="leading-[0.9]" style={{ ...DISPLAY_LUXE, fontWeight: 300, color: COLORS.ivory, letterSpacing: "-0.03em" }}>
            <span className="block whitespace-nowrap text-[58px] sm:text-[72px]">
              Folake<span style={{ color: COLORS.gold }}>@50</span>
            </span>
          </h1>
          <p className="text-[16px] italic mt-5" style={{ ...DISPLAY_LUXE, color: COLORS.ivoryDim }}>
            {days?.length ? formatLongDateRange(days) : "28 October – 1 November 2026"}, Sharm El Sheikh
          </p>
        </div>

        <div className="mt-8 flex gap-3">
          <GoldButton icon={ArrowRight} className="flex-1 flex-row-reverse" onClick={() => navigate("/itinerary")}>
            Itinerary
          </GoldButton>
          <GoldButton variant="outline" className="flex-1" onClick={() => navigate("/updates")}>
            Updates
          </GoldButton>
        </div>
      </div>

      <div className="px-6">
        <figure className="pt-10 pb-2" style={{ borderTop: `1px solid ${COLORS.line}` }}>
          <Eyebrow>A Note From the Planning Team</Eyebrow>
          <span className="block text-[64px] leading-[0.6] mt-4 select-none" style={{ ...DISPLAY_LUXE, color: COLORS.gold }} aria-hidden="true">
            &ldquo;
          </span>
          <blockquote className="text-[18px] leading-[1.6] italic mt-1 whitespace-pre-line" style={{ ...DISPLAY_LUXE, color: COLORS.ivory }}>
            {welcomeNote}
          </blockquote>
          <figcaption className="mt-5 text-[10px] font-semibold" style={{ color: COLORS.ivoryDim, fontFamily: F.body, ...CAPS, letterSpacing: "0.3em" }}>
            — The Planning Team
          </figcaption>
        </figure>

        <LintelDivider />
        <SectionTitle
          eyebrow="The Celebration"
          title="The Celebration of a Lifetime"
          light
          sub="Five days by the Red Sea, designed around sun, sea, stillness and celebration. No crowded checklist, no rushing from one thing to the next. Just beautiful places, beautiful people and enough room for the moments you cannot schedule."
        />
        <LandmarkSlideshow />

        <Card dark className="mb-4">
          <Eyebrow>Right Now</Eyebrow>
          <div className="flex items-center justify-between mb-4 gap-2">
            <span
              className="text-[22px] leading-tight min-w-0"
              style={{ ...DISPLAY_LUXE, color: COLORS.ivory, letterSpacing: "-0.01em" }}
            >
              {!status && "The countdown is on"}
              {status?.phase === "before" && "Trip has not started"}
              {status?.phase === "during" && (status.today?.theme || `Day ${status.dayNum}`)}
              {status?.phase === "after" && "The trip has ended"}
            </span>
            {status && (
              <Badge tone="gold">{`Day ${status.dayNum} of ${status.total}`}</Badge>
            )}
          </div>
          {nextActivity ? (
            <div className="space-y-3">
              <QuickRow icon={Sparkles} label={status?.phase === "during" ? "Next Activity" : "First Activity"} value={nextActivity.name} />
              {(nextActivity.departure_time || nextActivity.start_time) && (
                <QuickRow
                  icon={Clock}
                  label="Meeting Time"
                  value={parseTimeOn("1970-01-01", nextActivity.departure_time) ? nextActivity.departure_time : nextActivity.start_time}
                />
              )}
              {nextActivity.meeting_point && <QuickRow icon={MapPin} label="Meeting Point" value={nextActivity.meeting_point} />}
              {nextActivity.dress_code && <QuickRow icon={Shirt} label="Dress Code" value={nextActivity.dress_code} />}
              {latestUpdate && (
                <QuickRow icon={Bell} label={`Latest Update — ${latestUpdate.category}`} value={latestUpdate.message} />
              )}
            </div>
          ) : status?.phase === "after" ? (
            <p className="text-[12.5px]" style={{ color: COLORS.ivoryDim }}>
              Fifty years. Five days. One for the books. Thank you for being part of it — check the Gallery for the memories.
            </p>
          ) : (
            <p className="text-[12.5px]" style={{ color: COLORS.ivoryDim }}>
              {configured ? "The schedule will appear here once it's published." : "Connect Supabase to show the next activity here."}
            </p>
          )}
        </Card>

        <Card dark className="mb-4 relative">
          <SpotifyLogo className="absolute top-5 right-5" size={24} />
          <Eyebrow>The Soundtrack</Eyebrow>
          <h3 className="text-[22px] leading-tight mb-1" style={{ ...DISPLAY_LUXE, color: COLORS.ivory, letterSpacing: "-0.01em" }}>
            Flakes Egypt Takeover
          </h3>
          <p className="text-[12.5px] leading-relaxed mb-4" style={{ color: COLORS.ivoryDim }}>
            Our playlist for the trip. Join it on Spotify and add the songs you want to hear in Sharm.
          </p>
          <a
            href={PLAYLIST_INVITE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-[2px] text-[11px] font-semibold min-h-[46px] active:scale-[0.98] transition-all"
            style={{ background: COLORS.ivory, color: COLORS.ink, fontFamily: F.body, ...CAPS, letterSpacing: "0.18em" }}
          >
            <Music size={14} strokeWidth={1.75} />
            Join &amp; Add Songs
          </a>
        </Card>

        <div className="grid grid-cols-2 gap-3 mb-10">
          <QuickLinkCard icon={Shirt} title="Dress Codes" to="/dress-codes" />
          <QuickLinkCard icon={Plane} title="Travel Info" to="/travel" />
          <QuickLinkCard icon={Users} title="My Trip" to="/my-trip" />
          <QuickLinkCard icon={Phone} title="Emergency Contacts" to="/contacts" />
        </div>
      </div>
    </div>
  );
}

function QuickRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="w-[38px] h-[38px] shrink-0 flex items-center justify-center"
        style={{ background: COLORS.chip, borderRadius: 2 }}
      >
        <Icon size={16} color={COLORS.gold} />
      </div>
      <div className="min-w-0">
        <div className="text-[11px]" style={{ color: COLORS.ivoryDim, fontFamily: F.body }}>
          {label}
        </div>
        <div className="text-[13px] leading-snug font-medium" style={{ color: COLORS.ivory }}>
          {value}
        </div>
      </div>
    </div>
  );
}

function QuickLinkCard({ icon: Icon, title, to }) {
  return (
    <Link to={to}>
      <Card dark className="!p-4 h-full flex flex-col gap-3">
        <span
          className="w-[38px] h-[38px] flex items-center justify-center"
          style={{ background: COLORS.chip, borderRadius: 2 }}
        >
          <Icon size={17} color={COLORS.gold} />
        </span>
        <span className="text-[17px] leading-tight" style={{ ...DISPLAY_LUXE, fontWeight: 400, color: COLORS.ivory }}>
          {title}
        </span>
      </Card>
    </Link>
  );
}
