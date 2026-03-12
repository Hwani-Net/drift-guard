/* ============================================
   drift-guard Interactive Demo — Script
   ============================================ */

let currentStep = 0;
const terminal = document.getElementById('terminal');

// Original design tokens (for reference in terminal)
const ORIGINAL_TOKENS = {
  primary: '#3b82f6',
  fontFamily: 'Inter',
  borderRadius: '8px',
  navCta: '#3b82f6',
  btnRadius: '8px',
};

const DRIFTED_TOKENS = {
  primary: '#ef4444',
  fontFamily: 'Courier New',
  borderRadius: '0px',
  navCta: '#ef4444',
  btnRadius: '0px',
};

// ─── Terminal helpers ───
function clearTerminal() {
  terminal.innerHTML = '';
}

function addTerminalLine(content, cls) {
  const div = document.createElement('div');
  div.className = 'terminal-line';
  div.innerHTML = content;
  if (cls) div.classList.add(cls);
  terminal.appendChild(div);
  terminal.scrollTop = terminal.scrollHeight;
}

function addPromptLine(cmd) {
  addTerminalLine(`<span class="terminal-prompt">$</span> <span class="terminal-cmd">${cmd}</span>`);
}

function addOutput(text, cls = '') {
  addTerminalLine(`<span class="${cls}">${text}</span>`);
}

function addBlank() {
  addTerminalLine('&nbsp;');
}

async function typeCommand(cmd, speed = 40) {
  return new Promise((resolve) => {
    const line = document.createElement('div');
    line.className = 'terminal-line';
    line.innerHTML = '<span class="terminal-prompt">$</span> <span class="terminal-cmd"></span><span class="terminal-cursor">_</span>';
    terminal.appendChild(line);
    terminal.scrollTop = terminal.scrollHeight;

    const cmdSpan = line.querySelector('.terminal-cmd');
    const cursor = line.querySelector('.terminal-cursor');
    let i = 0;

    const interval = setInterval(() => {
      if (i < cmd.length) {
        cmdSpan.textContent += cmd[i];
        i++;
        terminal.scrollTop = terminal.scrollHeight;
      } else {
        clearInterval(interval);
        cursor.remove();
        resolve();
      }
    }, speed);
  });
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// ─── Step management ───
function setStepActive(n) {
  document.querySelectorAll('.step-btn').forEach(btn => {
    const s = parseInt(btn.dataset.step);
    btn.classList.remove('active', 'done');
    if (s < n) btn.classList.add('done');
    else if (s === n) btn.classList.add('active');
  });

  // Fill connectors
  for (let i = 1; i <= 3; i++) {
    const conn = document.getElementById('conn' + i);
    if (conn) {
      conn.classList.toggle('filled', i < n);
    }
  }
}

function updateActionBtn(icon, text, cls) {
  const btn = document.getElementById('actionBtn');
  const iconEl = document.getElementById('actionIcon');
  const textEl = document.getElementById('actionText');
  iconEl.textContent = icon;
  textEl.textContent = text;
  btn.className = 'action-btn';
  if (cls) btn.classList.add(cls);
}

// ─── Drift markers ───
function showDriftMarkers() {
  const container = document.getElementById('driftMarkers');
  container.innerHTML = '';

  const markers = [
    { top: '52px', left: '10px', text: '❌ color: #3b82f6 → #ef4444' },
    { top: '115px', right: '10px', text: '❌ font-family changed' },
    { top: '180px', left: '10px', text: '❌ border-radius: 8px → 0' },
    { top: '255px', right: '10px', text: '❌ CTA color changed' },
  ];

  markers.forEach((m, i) => {
    const el = document.createElement('div');
    el.className = 'drift-marker';
    el.textContent = m.text;
    el.style.top = m.top;
    if (m.left) el.style.left = m.left;
    if (m.right) el.style.right = m.right;
    el.style.animationDelay = `${i * 0.15}s`;
    container.appendChild(el);
  });
}

function hideDriftMarkers() {
  document.getElementById('driftMarkers').innerHTML = '';
}

// ─── Demo steps ───

async function step1_showDesign() {
  setStepActive(1);
  clearTerminal();
  addOutput('<span class="terminal-dim">// Your beautiful SaaS landing page</span>');
  addOutput('<span class="terminal-dim">// Design tokens: primary=#3b82f6, font=Inter, radius=8px</span>');
  addBlank();
  addOutput('<span class="terminal-highlight">🎨 Your design looks perfect. Let\'s lock it.</span>');

  updateActionBtn('🔒', 'Next: Lock Design Tokens', '');
}

async function step2_lockTokens() {
  setStepActive(2);
  clearTerminal();

  // Type the init command
  await typeCommand('npx drift-guard init --from design.html');
  await sleep(400);
  addBlank();
  addOutput('<span class="terminal-dim">Scanning design tokens...</span>');
  await sleep(300);
  addOutput('<span class="terminal-success">  ✓ Colors:     5 tokens locked</span>');
  await sleep(200);
  addOutput('<span class="terminal-success">  ✓ Fonts:      2 tokens locked</span>');
  await sleep(200);
  addOutput('<span class="terminal-success">  ✓ Spacing:    4 tokens locked</span>');
  await sleep(200);
  addOutput('<span class="terminal-success">  ✓ Radius:     2 tokens locked</span>');
  await sleep(200);
  addOutput('<span class="terminal-success">  ✓ Structure:  fingerprint captured</span>');
  await sleep(300);
  addBlank();
  addOutput('<span class="terminal-success">✅ Design snapshot created!</span>');
  addOutput('<span class="terminal-success">   Tokens locked: <strong>13</strong></span>');
  addOutput('<span class="terminal-dim">   Saved to .design-guard/snapshot.json</span>');

  // Show shield overlay
  document.getElementById('shieldOverlay').classList.add('visible');

  await sleep(600);
  updateActionBtn('🤖', 'Next: AI Modifies Your Code...', 'danger');
}

async function step3_aiModifies() {
  setStepActive(3);

  // Hide shield
  document.getElementById('shieldOverlay').classList.remove('visible');

  clearTerminal();
  addOutput('<span class="terminal-dim">// AI agent received your prompt:</span>');
  addOutput('<span class="terminal-highlight">"Add a login feature to the landing page"</span>');
  addBlank();
  await sleep(500);
  addOutput('<span class="terminal-warn">🤖 AI is modifying your code...</span>');
  await sleep(300);
  addOutput('<span class="terminal-dim">  → Changed primary color for "urgency"</span>');
  await sleep(200);
  addOutput('<span class="terminal-dim">  → Swapped font to match "new theme"</span>');
  await sleep(200);
  addOutput('<span class="terminal-dim">  → Removed border-radius for "modern look"</span>');
  await sleep(200);
  addOutput('<span class="terminal-dim">  → Updated CTA button styling</span>');

  // Apply drift to the mock UI
  document.getElementById('mockUI').classList.add('drifted');
  document.getElementById('uiPanelTitle').textContent = 'your-app.html (modified by AI)';

  await sleep(600);
  addBlank();
  addOutput('<span class="terminal-error">😱 Your design has been changed!</span>');
  addOutput('<span class="terminal-dim">   But drift-guard is watching...</span>');

  await sleep(400);
  updateActionBtn('🛡️', 'Next: Run drift-guard check', 'success');
}

async function step4_driftCaught() {
  setStepActive(4);
  clearTerminal();

  await typeCommand('npx drift-guard check');
  await sleep(500);
  addBlank();
  addOutput('<span class="terminal-dim">Comparing against snapshot...</span>');
  await sleep(400);

  addBlank();
  addOutput('<span class="terminal-error">❌ Design Drift Detected!</span>');
  addOutput('<span class="terminal-error">   Drift Score: 30.77% (threshold: 10%)</span>');
  addBlank();
  await sleep(300);
  addOutput('<span class="terminal-error">  Token Changes (4 of 13):</span>');
  await sleep(200);
  addOutput(`<span class="terminal-error">  ~ --primary: ${ORIGINAL_TOKENS.primary} → ${DRIFTED_TOKENS.primary}</span>`);
  await sleep(150);
  addOutput(`<span class="terminal-error">  ~ font-family: ${ORIGINAL_TOKENS.fontFamily} → ${DRIFTED_TOKENS.fontFamily}</span>`);
  await sleep(150);
  addOutput(`<span class="terminal-error">  ~ border-radius: ${ORIGINAL_TOKENS.borderRadius} → ${DRIFTED_TOKENS.borderRadius}</span>`);
  await sleep(150);
  addOutput(`<span class="terminal-error">  ~ nav-cta-bg: ${ORIGINAL_TOKENS.navCta} → ${DRIFTED_TOKENS.navCta}</span>`);
  addBlank();
  await sleep(300);
  addOutput('<span class="terminal-error">🛡️ Design drift blocked. Exit code 1.</span>');
  addOutput('<span class="terminal-dim">   Pre-commit hook prevented the commit.</span>');
  addBlank();
  addOutput('<span class="terminal-success">💡 Run "npx drift-guard rules" to teach AI your design boundaries.</span>');

  // Show drift markers
  showDriftMarkers();

  await sleep(400);

  // Update button to show reset
  const actionBtn = document.getElementById('actionBtn');
  actionBtn.style.display = 'none';
  document.getElementById('resetBtn').style.display = 'inline-flex';
}

// ─── Main controller ───
async function advanceStep() {
  const btn = document.getElementById('actionBtn');
  btn.disabled = true;
  btn.style.opacity = '0.6';

  currentStep++;

  switch (currentStep) {
    case 1: await step1_showDesign(); break;
    case 2: await step2_lockTokens(); break;
    case 3: await step3_aiModifies(); break;
    case 4: await step4_driftCaught(); break;
  }

  btn.disabled = false;
  btn.style.opacity = '1';
}

function resetDemo() {
  currentStep = 0;
  setStepActive(1);
  clearTerminal();

  // Reset terminal to initial state
  terminal.innerHTML = '<div class="terminal-line"><span class="terminal-prompt">$</span> <span class="terminal-cursor" id="cursor">_</span></div>';

  // Reset mock UI
  document.getElementById('mockUI').classList.remove('drifted');
  document.getElementById('shieldOverlay').classList.remove('visible');
  document.getElementById('uiPanelTitle').textContent = 'your-app.html';
  hideDriftMarkers();

  // Reset connectors
  for (let i = 1; i <= 3; i++) {
    const conn = document.getElementById('conn' + i);
    if (conn) conn.classList.remove('filled');
  }

  // Reset buttons
  const actionBtn = document.getElementById('actionBtn');
  actionBtn.style.display = 'inline-flex';
  document.getElementById('resetBtn').style.display = 'none';
  updateActionBtn('🎨', 'Start: See Your Beautiful Design', '');

  // Reset step buttons
  document.querySelectorAll('.step-btn').forEach(btn => {
    btn.classList.remove('active', 'done');
  });
  document.querySelector('[data-step="1"]').classList.add('active');
}

// ─── Copy install command ───
function copyInstall() {
  const cmd = document.getElementById('installCmd').textContent;
  navigator.clipboard.writeText(cmd).then(() => {
    const btn = document.getElementById('copyBtn');
    btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>';
    setTimeout(() => {
      btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>';
    }, 2000);
  });
}
