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

function card(t) {
  const barWidth = 776;
  const filled = Math.max(8, Math.round((barWidth * share) / 100));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="840" height="168" viewBox="0 0 840 168" role="img" aria-label="${total.toLocaleString('en-US')} contributions in the past 12 months, ${share}% in private client repos">
  <rect x="0.5" y="0.5" width="839" height="167" rx="12" fill="${t.bg}" stroke="${t.border}"/>
  <text x="32" y="40" font-family="${MONO}" font-size="12" letter-spacing="1.5" fill="${t.muted}">RECEIPTS · PAST 12 MONTHS</text>
  <text x="32" y="88" font-family="${MONO}" font-size="40" font-weight="700" fill="${t.fg}">${total.toLocaleString('en-US')}</text>
  <text x="32" y="112" font-family="${SANS}" font-size="14" fill="${t.muted}">contributions</text>
  <text x="272" y="88" font-family="${MONO}" font-size="40" font-weight="700" fill="${t.accent}">${share}%</text>
  <text x="272" y="112" font-family="${SANS}" font-size="14" fill="${t.muted}">in private client repos</text>
  <text x="520" y="70" font-family="${SANS}" font-size="14" font-weight="600" fill="${t.fg}">Why the public repos are quiet</text>
  <text x="520" y="92" font-family="${SANS}" font-size="13" fill="${t.muted}">Client work ships from private repos.</text>
  <text x="520" y="112" font-family="${SANS}" font-size="13" fill="${t.muted}">Refreshed every Monday from the GitHub API.</text>
  <rect x="32" y="136" width="${barWidth}" height="8" rx="4" fill="${t.track}"/>
  <rect x="32" y="136" width="${filled}" height="8" rx="4" fill="${t.accent}"/>
</svg>
`;
}

mkdirSync('assets', { recursive: true });
for (const [name, theme] of Object.entries(THEMES)) {
  writeFileSync(`assets/receipts-${name}.svg`, card(theme));
}
console.log(`receipts: ${total} contributions, ${share}% private`);
