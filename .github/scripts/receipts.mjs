import { mkdirSync, writeFileSync } from 'node:fs';

const login = process.env.GITHUB_REPOSITORY_OWNER;
const token = process.env.GITHUB_TOKEN;
if (!login || !token) throw new Error('GITHUB_REPOSITORY_OWNER and GITHUB_TOKEN must be set');

const query = `query($login: String!) {
  user(login: $login) {
    contributionsCollection {
      contributionCalendar { totalContributions }
      restrictedContributionsCount
    }
  }
}`;

const res = await fetch('https://api.github.com/graphql', {
  method: 'POST',
  headers: {
    Authorization: `bearer ${token}`,
    'Content-Type': 'application/json',
    'User-Agent': 'profile-receipts',
  },
  body: JSON.stringify({ query, variables: { login } }),
});
if (!res.ok) throw new Error(`GitHub GraphQL returned ${res.status}: ${await res.text()}`);
const { data, errors } = await res.json();
if (errors) throw new Error(`GitHub GraphQL errors: ${JSON.stringify(errors)}`);

const stats = data.user.contributionsCollection;
const total = stats.contributionCalendar.totalContributions;
if (!total) throw new Error('GitHub returned zero contributions; refusing to overwrite the receipts card');
const share = Math.floor((stats.restrictedContributionsCount / total) * 100);

const THEMES = {
  dark: { bg: '#161B22', border: '#30363D', fg: '#E6EDF3', muted: '#8B949E', accent: '#3FB950', track: '#21262D' },
  light: { bg: '#F6F8FA', border: '#D0D7DE', fg: '#1F2328', muted: '#59636E', accent: '#1A7F37', track: '#E1E4E8' },
};

const SANS = "-apple-system, 'Segoe UI', Helvetica, Arial, sans-serif";
const MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

const updated = new Date().toLocaleDateString('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
});

function card(t) {
  const barWidth = 784;
  const filled = Math.max(8, Math.round((barWidth * share) / 100));
  const count = total.toLocaleString('en-US');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="840" height="206" viewBox="0 0 840 206" role="img" aria-label="${count} contributions on GitHub in the last 12 months, ${share}% of them client work in private repositories. Recalculated every Monday; last updated ${updated}.">
  <rect x="0.5" y="0.5" width="839" height="205" rx="12" fill="${t.bg}" stroke="${t.border}"/>
  <text x="28" y="34" font-family="${MONO}" font-size="11" letter-spacing="1.5" fill="${t.muted}">MY GITHUB ACTIVITY · LAST 12 MONTHS</text>

  <text x="28" y="76" font-family="${MONO}" font-size="34" font-weight="700" fill="${t.fg}">${count}</text>
  <text x="28" y="98" font-family="${SANS}" font-size="13" font-weight="600" fill="${t.fg}">contributions</text>
  <text x="28" y="116" font-family="${SANS}" font-size="12" fill="${t.muted}">code changes, pull requests, reviews</text>

  <text x="270" y="76" font-family="${MONO}" font-size="34" font-weight="700" fill="${t.accent}">${share}%</text>
  <text x="270" y="98" font-family="${SANS}" font-size="13" font-weight="600" fill="${t.fg}">of it is client work</text>
  <text x="270" y="116" font-family="${SANS}" font-size="12" fill="${t.muted}">in private company code, not public</text>

  <text x="520" y="62" font-family="${SANS}" font-size="13" font-weight="600" fill="${t.fg}">Why so few public projects?</text>
  <text x="520" y="82" font-family="${SANS}" font-size="12" fill="${t.muted}">My work belongs to the companies I build for,</text>
  <text x="520" y="99" font-family="${SANS}" font-size="12" fill="${t.muted}">so it stays private. GitHub still counts it,</text>
  <text x="520" y="116" font-family="${SANS}" font-size="12" fill="${t.muted}">which is where these numbers come from.</text>

  <rect x="28" y="136" width="${barWidth}" height="6" rx="3" fill="${t.track}"/>
  <rect x="28" y="136" width="${filled}" height="6" rx="3" fill="${t.accent}"/>
  <text x="28" y="158" font-family="${SANS}" font-size="11" font-weight="600" fill="${t.accent}">Private client work · ${share}%</text>
  <text x="812" y="158" text-anchor="end" font-family="${SANS}" font-size="11" fill="${t.muted}">Public · ${100 - share}%</text>

  <line x1="28" y1="172" x2="812" y2="172" stroke="${t.border}"/>
  <text x="28" y="192" font-family="${SANS}" font-size="11" fill="${t.muted}">↻ Recalculated automatically every Monday from GitHub's own records.</text>
  <text x="812" y="192" text-anchor="end" font-family="${SANS}" font-size="11" font-weight="600" fill="${t.fg}">Last updated ${updated}</text>
</svg>
`;
}

mkdirSync('assets', { recursive: true });
for (const [name, theme] of Object.entries(THEMES)) {
  writeFileSync(`assets/receipts-${name}.svg`, card(theme));
}
console.log(`receipts: ${total} contributions, ${share}% private`);
