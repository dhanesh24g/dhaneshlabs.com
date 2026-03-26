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

function pick(array) { return array[Math.floor(Math.random() * array.length)]; }

function setDynamicBits() {
  const latest = document.getElementById('latest-drop');
  const pill = document.getElementById('status-pill');
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  if (latest) latest.textContent = `${pick(drops)} · updated ${dateStr}`;
  if (pill) pill.textContent = pick(status);
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

window.addEventListener('DOMContentLoaded', () => {
  setDynamicBits();
  handleScrollReveal();
});
