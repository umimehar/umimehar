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
  const barWidth = 776;
  const filled = Math.max(8, Math.round((barWidth * share) / 100));
  const count = total.toLocaleString('en-US');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="840" height="262" viewBox="0 0 840 262" role="img" aria-label="${count} contributions on GitHub in the last 12 months, ${share}% of them client work in private repositories. Recalculated every Monday; last updated ${updated}.">
  <rect x="0.5" y="0.5" width="839" height="261" rx="12" fill="${t.bg}" stroke="${t.border}"/>
  <text x="32" y="40" font-family="${MONO}" font-size="12" letter-spacing="1.5" fill="${t.muted}">MY GITHUB ACTIVITY · LAST 12 MONTHS</text>

  <text x="32" y="90" font-family="${MONO}" font-size="40" font-weight="700" fill="${t.fg}">${count}</text>
  <text x="32" y="114" font-family="${SANS}" font-size="14" font-weight="600" fill="${t.fg}">contributions</text>
  <text x="32" y="134" font-family="${SANS}" font-size="12" fill="${t.muted}">code changes, pull requests</text>
  <text x="32" y="150" font-family="${SANS}" font-size="12" fill="${t.muted}">and code reviews</text>

  <text x="272" y="90" font-family="${MONO}" font-size="40" font-weight="700" fill="${t.accent}">${share}%</text>
  <text x="272" y="114" font-family="${SANS}" font-size="14" font-weight="600" fill="${t.fg}">of it is client work</text>
  <text x="272" y="134" font-family="${SANS}" font-size="12" fill="${t.muted}">done in private company code</text>
  <text x="272" y="150" font-family="${SANS}" font-size="12" fill="${t.muted}">that is not open to the public</text>

  <text x="520" y="80" font-family="${SANS}" font-size="14" font-weight="600" fill="${t.fg}">Why so few public projects?</text>
  <text x="520" y="102" font-family="${SANS}" font-size="13" fill="${t.muted}">My work belongs to the companies I build</text>
  <text x="520" y="120" font-family="${SANS}" font-size="13" fill="${t.muted}">for, so it stays private. GitHub still</text>
  <text x="520" y="138" font-family="${SANS}" font-size="13" fill="${t.muted}">counts it, which is where these numbers</text>
  <text x="520" y="156" font-family="${SANS}" font-size="13" fill="${t.muted}">come from.</text>

  <rect x="32" y="178" width="${barWidth}" height="8" rx="4" fill="${t.track}"/>
  <rect x="32" y="178" width="${filled}" height="8" rx="4" fill="${t.accent}"/>
  <text x="32" y="204" font-family="${SANS}" font-size="12" font-weight="600" fill="${t.accent}">Private client work · ${share}%</text>
  <text x="808" y="204" text-anchor="end" font-family="${SANS}" font-size="12" fill="${t.muted}">Public · ${100 - share}%</text>

  <line x1="32" y1="220" x2="808" y2="220" stroke="${t.border}"/>
  <text x="32" y="244" font-family="${SANS}" font-size="12" fill="${t.muted}">↻ Recalculated automatically every Monday from GitHub's own records.</text>
  <text x="808" y="244" text-anchor="end" font-family="${SANS}" font-size="12" font-weight="600" fill="${t.fg}">Last updated ${updated}</text>
</svg>
`;
}

mkdirSync('assets', { recursive: true });
for (const [name, theme] of Object.entries(THEMES)) {
  writeFileSync(`assets/receipts-${name}.svg`, card(theme));
}
console.log(`receipts: ${total} contributions, ${share}% private`);
