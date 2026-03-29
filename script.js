const drops = [
  'Vision-native UI Kit',
  'Autonomous Sprint Coach',
  'LangGraph + Vercel starter',
  'Creator Classroom: Week 2',
  'Realtime RAG playground'
];
const status = [
  'Autonomous Sprint Coach',
  'Edge deployment checklist',
  'Streaming UI revamp'
];
const productDrops = [
  'Products hub structure',
  'League Ledger detail page',
  'Product labeling system',
  'Scalable product routing'
];
const productStatus = [
  'Products Hub',
  'League Ledger featured',
  'Live and beta lineup'
];
const leagueLedgerDrops = [
  'League setup flow',
  'Tie-aware payout logic',
  'Washout refund handling',
  'Live player ledger'
];
const leagueLedgerStatus = [
  'League Ledger',
  'Payout workflow polish',
  'Settlement visibility'
];
const THEME_STORAGE_KEY = 'dhaneshlabs-theme';

function pick(array) { return array[Math.floor(Math.random() * array.length)]; }

function setDynamicBits() {
  const latest = document.getElementById('latest-drop');
  const pill = document.getElementById('status-pill');
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const pathname = window.location.pathname;
  const isProductsHub = pathname === '/products' || pathname.endsWith('/products.html');
  const isLeagueLedgerPage = pathname === '/products/league-ledger' || pathname.endsWith('/products/league-ledger.html');
  const activeDrops = isLeagueLedgerPage ? leagueLedgerDrops : isProductsHub ? productDrops : drops;
  const activeStatus = isLeagueLedgerPage ? leagueLedgerStatus : isProductsHub ? productStatus : status;
  if (latest) latest.textContent = `${pick(activeDrops)} · updated ${dateStr}`;
  if (pill) pill.textContent = pick(activeStatus);
}

function handleScrollReveal() {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('reveal');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.2 });

  document.querySelectorAll('section').forEach(section => observer.observe(section));
}

function getPreferredTheme() {
  if (typeof window === 'undefined') return 'dark';
  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (storedTheme === 'light' || storedTheme === 'dark') return storedTheme;
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function setTheme(theme) {
  const safeTheme = theme === 'light' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', safeTheme);
  window.localStorage.setItem(THEME_STORAGE_KEY, safeTheme);
  const button = document.getElementById('theme-toggle');
  if (button) {
    const nextMode = safeTheme === 'dark' ? 'light' : 'dark';
    button.setAttribute('aria-label', `Switch to ${nextMode} mode`);
    button.setAttribute('title', `Switch to ${nextMode} mode`);
    button.setAttribute('aria-pressed', safeTheme === 'light' ? 'true' : 'false');
    button.setAttribute('data-theme', safeTheme);
  }
}

function injectThemeToggle() {
  const navActions = document.querySelector('.nav-actions');
  if (!navActions || document.getElementById('theme-toggle')) return;

  const appsLink = navActions.querySelector('a[href^="https://apps.dhaneshlabs.com"]');
  if (appsLink) {
    appsLink.textContent = 'Apps Hub';
  }

  const themeControl = document.createElement('div');
  themeControl.className = 'theme-control';

  const toggleButton = document.createElement('button');
  toggleButton.id = 'theme-toggle';
  toggleButton.type = 'button';
  toggleButton.className = 'theme-toggle';
  themeControl.append(toggleButton);
  navActions.appendChild(themeControl);
  toggleButton.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    setTheme(currentTheme === 'light' ? 'dark' : 'light');
  });
}

function initializeTheme() {
  injectThemeToggle();
  setTheme(getPreferredTheme());
}

window.addEventListener('DOMContentLoaded', () => {
  initializeTheme();
  setDynamicBits();
  handleScrollReveal();
});
