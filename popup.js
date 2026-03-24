// popup.js – CoverCraft Extension Logic

// State
let state = {
  jobDetails: null,
  resumeText: '',
  resumeFileName: '',
  resumeFileSize: '',
  selectedTone: 'professional',
  apiKey: '',
  userName: '',
  userEmail: '',
  generatedLetter: '',
  resumeMode: 'upload', // 'upload' | 'paste'
};

// DOM refs
const $ = id => document.getElementById(id);
const jobCard           = $('jobCard');
const jobTitle          = $('jobTitle');
const jobMeta           = $('jobMeta');
const jobStatus         = $('jobStatus');
const generateBtn       = $('generateBtn');
const generateSection   = $('generateSection');
const loadingState      = $('loadingState');
const loadingStep       = $('loadingStep');
const outputSection     = $('outputSection');
const coverLetterOutput = $('coverLetterOutput');
const wordCount         = $('wordCount');
const copyBtn           = $('copyBtn');
const regenBtn          = $('regenBtn');
const errorBox          = $('errorBox');
const apiKeyInput       = $('apiKeyInput');
const userNameInput     = $('userNameInput');
const userEmailInput    = $('userEmailInput');
const saveSettings      = $('saveSettings');
const saveNotice        = $('saveNotice');
const settingsToggle    = $('settingsToggle');
const expandJob         = $('expandJob');
const detailCompany     = $('detailCompany');
const detailCompanyVal  = $('detailCompanyVal');
const detailLocation    = $('detailLocation');
const detailLocationVal = $('detailLocationVal');
const detailSite        = $('detailSite');
const detailSiteVal     = $('detailSiteVal');
const detailUrl         = $('detailUrl');
const detailUrlVal      = $('detailUrlVal');
const detailDescWrap    = $('detailDescWrap');
const detailDescVal     = $('detailDescVal');

// Upload mode
const uploadMode     = $('uploadMode');
const uploadZone     = $('uploadZone');   // <label>
const resumeFile     = $('resumeFile');   // hidden <input type="file">
const resumeLoaded   = $('resumeLoaded');
const resumeFileName = $('resumeFileName');
const resumeFileSize = $('resumeFileSize');
const resumeClear    = $('resumeClear');

// Paste mode
const pasteMode      = $('pasteMode');
const pasteArea      = $('pasteArea');
const pasteConfirm   = $('pasteConfirm');
const pasteLoaded    = $('pasteLoaded');
const pasteWordCount = $('pasteWordCount');
const pasteClear     = $('pasteClear');

// Toggle
const toggleUpload = $('toggleUpload');
const togglePaste  = $('togglePaste');

// Tabs
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    $('tab-' + tab.dataset.tab).classList.add('active');
  });
});

settingsToggle.addEventListener('click', () => {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelector('[data-tab="settings"]').classList.add('active');
  $('tab-settings').classList.add('active');
});

// Tone selector
document.querySelectorAll('.tone-opt').forEach(opt => {
  opt.addEventListener('click', () => {
    document.querySelectorAll('.tone-opt').forEach(o => o.classList.remove('selected'));
    opt.classList.add('selected');
    state.selectedTone = opt.dataset.tone;
  });
});

// Load stored settings
async function loadSettings() {
  const data = await chrome.storage.local.get([
    'apiKey', 'userName', 'userEmail',
    'resumeText', 'resumeFileName', 'resumeFileSize', 'resumeMode'
  ]);
  if (data.apiKey)    { state.apiKey = data.apiKey;       apiKeyInput.value    = data.apiKey; }
  if (data.userName)  { state.userName = data.userName;   userNameInput.value  = data.userName; }
  if (data.userEmail) { state.userEmail = data.userEmail; userEmailInput.value = data.userEmail; }
  if (data.resumeText) {
    state.resumeText     = data.resumeText;
    state.resumeFileName = data.resumeFileName || 'resume';
    state.resumeFileSize = data.resumeFileSize || '';
    state.resumeMode     = data.resumeMode || 'upload';
    if (state.resumeMode === 'paste') {
      switchToPaste(false);
      showPasteLoaded();
    } else {
      switchToUpload(false);
      showUploadLoaded();
    }
  }
  updateGenerateBtn();
}

// Save settings
saveSettings.addEventListener('click', async () => {
  state.apiKey    = apiKeyInput.value.trim();
  state.userName  = userNameInput.value.trim();
  state.userEmail = userEmailInput.value.trim();
  await chrome.storage.local.set({ apiKey: state.apiKey, userName: state.userName, userEmail: state.userEmail });
  saveNotice.textContent = 'Saved!';
  setTimeout(() => { saveNotice.textContent = ''; }, 2000);
  updateGenerateBtn();
});

// Supported sites
const SUPPORTED_SITES = ['seek.com.au', 'indeed.com', 'jora.com', 'glassdoor.com', 'linkedin.com'];
function isSupportedSite(url) { return SUPPORTED_SITES.some(s => url.includes(s)); }

// Job detection
async function detectJob() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url || !isSupportedSite(tab.url)) {
      state.jobDetails = null;
      setJobState(null, 'Open a job listing on Seek, Indeed, Jora, Glassdoor, or LinkedIn');
      updateGenerateBtn(); return;
    }
    let details;
    try {
      details = await chrome.tabs.sendMessage(tab.id, { action: 'getJobDetails' });
    } catch {
      try {
        await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
        await new Promise(r => setTimeout(r, 400));
        details = await chrome.tabs.sendMessage(tab.id, { action: 'getJobDetails' });
      } catch { details = null; }
    }
    if (details && details.title) { state.jobDetails = details; setJobState(details, null); }
    else { state.jobDetails = null; setJobState(null, 'Navigate to a specific job listing page'); }
  } catch {
    state.jobDetails = null;
    setJobState(null, 'Could not read page — try refreshing the job listing');
  }
  updateGenerateBtn();
}

function setJobState(details, errorMsg) {
  if (details && details.title) {
    jobCard.className = 'job-card detected expandable';
    jobTitle.textContent = details.title;
    const metaParts = [details.company, details.location].filter(Boolean);
    jobMeta.textContent = metaParts.join(' · ') || (details.site || 'Job');
    jobStatus.className = 'job-status ok';
    jobStatus.innerHTML = '<span class="status-dot"></span><span>Detected' + (details.site ? ' · ' + details.site : '') + '</span>';
    expandJob.style.display = 'flex';
    const show = (el, val, valEl) => { if (val) { valEl.textContent = val; el.style.display = 'flex'; } else { el.style.display = 'none'; } };
    show(detailCompany,  details.company,  detailCompanyVal);
    show(detailLocation, details.location, detailLocationVal);
    show(detailSite,     details.site,     detailSiteVal);
    if (details.url) {
      detailUrlVal.textContent = details.url.replace(/^https?:\/\//, '').slice(0, 50) + (details.url.length > 55 ? '…' : '');
      detailUrlVal.href = details.url;
      detailUrl.style.display = 'flex';
    } else { detailUrl.style.display = 'none'; }
    if (details.description) {
      detailDescVal.textContent = details.description.slice(0, 600) + (details.description.length > 600 ? '…' : '');
      detailDescWrap.style.display = 'block';
    } else { detailDescWrap.style.display = 'none'; }
  } else {
    jobCard.className = 'job-card empty';
    jobTitle.textContent = 'No job detected';
    jobMeta.textContent  = errorMsg || 'Open a job listing on a supported site';
    jobStatus.className  = 'job-status warn';
    jobStatus.innerHTML  = '<span class="status-dot"></span><span>Not Detected</span>';
    expandJob.style.display = 'none';
    jobCard.classList.remove('expanded');
  }
}

jobCard.addEventListener('click', e => {
  if (e.target.closest('#refreshJob')) return;
  if (!jobCard.classList.contains('detected')) return;
  jobCard.classList.toggle('expanded');
});
expandJob.addEventListener('click', e => { e.stopPropagation(); jobCard.classList.toggle('expanded'); });
$('refreshJob').addEventListener('click', e => { e.stopPropagation(); detectJob(); });

// Resume mode toggle
toggleUpload.addEventListener('click', () => switchToUpload(true));
togglePaste.addEventListener('click',  () => switchToPaste(true));

function switchToUpload(clearResume) {
  state.resumeMode = 'upload';
  toggleUpload.classList.add('active');
  togglePaste.classList.remove('active');
  uploadMode.style.display = 'block';
  pasteMode.style.display  = 'none';
  if (clearResume) clearResumeState();
}

function switchToPaste(clearResume) {
  state.resumeMode = 'paste';
  togglePaste.classList.add('active');
  toggleUpload.classList.remove('active');
  pasteMode.style.display  = 'block';
  uploadMode.style.display = 'none';
  if (clearResume) clearResumeState();
}

function clearResumeState() {
  state.resumeText     = '';
  state.resumeFileName = '';
  state.resumeFileSize = '';
  chrome.storage.local.remove(['resumeText', 'resumeFileName', 'resumeFileSize', 'resumeMode']);
  // Reset upload UI
  resumeLoaded.style.display = 'none';
  // Reset paste UI
  pasteArea.value = '';
  pasteLoaded.style.display = 'none';
  pasteConfirm.disabled = true;
  updateGenerateBtn();
}

// Upload: file input (label-click is the trigger — no JS .click() needed) 
//
// The <label for="resumeFile"> in the HTML is the clickable zone.
// The browser fires a trusted user-gesture click on the input, keeping
// the popup alive in both Chrome and Firefox. We only need to listen
// for the `change` event here.
resumeFile.addEventListener('change', async e => {
  const file = e.target.files[0];
  if (!file) return;
  await handleResumeFile(file);
  resumeFile.value = ''; // reset so the same file can be re-selected
});

// Drag & drop onto the label
uploadZone.addEventListener('dragover', e => { e.preventDefault(); uploadZone.classList.add('drag-over'); });
uploadZone.addEventListener('dragleave', () => { uploadZone.classList.remove('drag-over'); });
uploadZone.addEventListener('drop', async e => {
  e.preventDefault();
  uploadZone.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file) await handleResumeFile(file);
});

async function handleResumeFile(file) {
  if (file.size > 5 * 1024 * 1024) { showError('Resume file must be under 5MB'); return; }
  const text = await readFileAsText(file);
  state.resumeText     = text;
  state.resumeFileName = file.name;
  state.resumeFileSize = formatFileSize(file.size);
  state.resumeMode     = 'upload';
  await chrome.storage.local.set({
    resumeText: text, resumeFileName: file.name,
    resumeFileSize: state.resumeFileSize, resumeMode: 'upload'
  });
  showUploadLoaded();
  updateGenerateBtn();
}

function showUploadLoaded() {
  uploadZone.style.display     = 'none';
  resumeLoaded.style.display   = 'flex';
  resumeLoaded.classList.add('has-file');
  resumeFileName.textContent   = state.resumeFileName;
  resumeFileSize.textContent   = state.resumeFileSize;
}

resumeClear.addEventListener('click', async () => {
  state.resumeText = state.resumeFileName = state.resumeFileSize = '';
  await chrome.storage.local.remove(['resumeText', 'resumeFileName', 'resumeFileSize', 'resumeMode']);
  uploadZone.style.display   = '';
  resumeLoaded.style.display = 'none';
  updateGenerateBtn();
});

// Paste mode
pasteArea.addEventListener('input', () => {
  pasteConfirm.disabled = pasteArea.value.trim().length < 20;
});

pasteConfirm.addEventListener('click', async () => {
  const text = pasteArea.value.trim();
  if (text.length < 20) return;
  state.resumeText     = text;
  state.resumeFileName = 'pasted-resume';
  state.resumeFileSize = '';
  state.resumeMode     = 'paste';
  const wc = text.split(/\s+/).length;
  await chrome.storage.local.set({
    resumeText: text, resumeFileName: 'pasted-resume',
    resumeFileSize: wc + ' words', resumeMode: 'paste'
  });
  pasteWordCount.textContent = wc + ' words';
  showPasteLoaded();
  updateGenerateBtn();
});

function showPasteLoaded() {
  pasteArea.style.display    = 'none';
  pasteConfirm.style.display = 'none';
  pasteLoaded.style.display  = 'flex';
  pasteLoaded.classList.add('has-file');
  pasteWordCount.textContent = state.resumeFileSize || (state.resumeText.split(/\s+/).length + ' words');
}

pasteClear.addEventListener('click', async () => {
  state.resumeText = state.resumeFileName = state.resumeFileSize = '';
  await chrome.storage.local.remove(['resumeText', 'resumeFileName', 'resumeFileSize', 'resumeMode']);
  pasteArea.value            = '';
  pasteArea.style.display    = '';
  pasteConfirm.style.display = '';
  pasteConfirm.disabled      = true;
  pasteLoaded.style.display  = 'none';
  updateGenerateBtn();
});

// Helpers
function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = e => resolve(e.target.result);
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.readAsText(file);
  });
}

function formatFileSize(bytes) {
  if (bytes < 1024)        return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// Generate button state
function updateGenerateBtn() {
  const ready = !!(state.apiKey && state.resumeText && state.jobDetails);
  generateBtn.disabled = !ready;
  if (!state.apiKey)          generateBtn.title = 'Add your API key in Settings';
  else if (!state.resumeText) generateBtn.title = 'Upload or paste your resume';
  else if (!state.jobDetails) generateBtn.title = 'Open a supported job listing';
  else                        generateBtn.title = '';
}

// Generate cover letter
generateBtn.addEventListener('click', generate);
regenBtn.addEventListener('click', generate);

async function generate() {
  if (!state.apiKey || !state.resumeText || !state.jobDetails) return;
  hideError();
  generateSection.style.display = 'none';
  outputSection.style.display   = 'none';
  loadingState.style.display    = 'block';

  const steps = ['Reading job description…','Analysing your resume…','Matching your skills…','Crafting your letter…','Polishing the final draft…'];
  let stepIdx = 0;
  loadingStep.textContent = steps[0];
  const stepInterval = setInterval(() => { stepIdx = (stepIdx + 1) % steps.length; loadingStep.textContent = steps[stepIdx]; }, 1800);

  try {
    const letter = await callClaudeAPI();
    state.generatedLetter = letter;
    clearInterval(stepInterval);
    showOutput(letter);
  } catch (err) {
    clearInterval(stepInterval);
    loadingState.style.display    = 'none';
    generateSection.style.display = 'block';
    showError(err.message || 'Something went wrong. Check your API key in Settings.');
  }
}

async function callClaudeAPI() {
  const { jobDetails, resumeText, selectedTone, userName, userEmail } = state;
  const toneMap = {
    professional: 'Write in a polished, formal professional tone. Demonstrate confidence and competence.',
    enthusiastic: 'Write with genuine enthusiasm and warmth. Show real passion for the role and company.',
    concise:      'Be extremely concise — max 3 short paragraphs. Every word must earn its place.',
    storytelling: 'Use a narrative approach. Open with a compelling story or moment that connects to the role.',
  };
  const userBlock = [userName ? 'Applicant name: ' + userName : '', userEmail ? 'Email: ' + userEmail : ''].filter(Boolean).join('\n');
  const prompt = [
    'You are an expert cover letter writer. Write a tailored, compelling cover letter for this job application.',
    '', 'JOB DETAILS:',
    'Title: ' + jobDetails.title,
    'Company: ' + (jobDetails.company || 'the company'),
    'Location: ' + (jobDetails.location || ''),
    'Job Description:', jobDetails.description.slice(0, 3000),
    '', "APPLICANT'S RESUME:", resumeText.slice(0, 3000), '',
    userBlock ? 'APPLICANT DETAILS:\n' + userBlock + '\n' : '',
    'INSTRUCTIONS:',
    '- ' + (toneMap[selectedTone] || toneMap.professional),
    '- Tailor the letter specifically to this job and company — reference specific requirements',
    '- Highlight the most relevant skills and experience from the resume',
    '- Do NOT use generic filler phrases like "I am writing to express my interest"',
    '- Make it feel human and authentic, not AI-generated',
    '- Include a strong opening hook, relevant middle paragraphs, and a confident close',
    '- Length: 3-4 paragraphs (unless tone is "concise")',
    '- Do NOT include "[Your Name]" or placeholder brackets — use actual info if provided, otherwise omit signature',
    '- Output ONLY the cover letter text, no preamble or commentary',
  ].join('\n');

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': state.apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 1024, messages: [{ role: 'user', content: prompt }] }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    if (response.status === 401) throw new Error('Invalid API key — check Settings');
    if (response.status === 429) throw new Error('Rate limit hit — try again in a moment');
    throw new Error((errData?.error?.message) || 'API error ' + response.status);
  }

  const data = await response.json();
  const text = (data.content || []).map(b => b.text || '').join('');
  if (!text) throw new Error('Empty response from API');
  return text.trim();
}

// Output display
const COPY_ICON  = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy';
const CHECK_ICON = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> Copied!';

function showOutput(letter) {
  loadingState.style.display    = 'none';
  generateSection.style.display = 'block';
  outputSection.style.display   = 'block';
  coverLetterOutput.textContent = letter;
  wordCount.textContent = letter.trim().split(/\s+/).length + ' words';
  copyBtn.classList.remove('copied');
  copyBtn.innerHTML = COPY_ICON;
}

copyBtn.addEventListener('click', async () => {
  if (!state.generatedLetter) return;
  await navigator.clipboard.writeText(state.generatedLetter);
  copyBtn.classList.add('copied');
  copyBtn.innerHTML = CHECK_ICON;
  setTimeout(() => { copyBtn.classList.remove('copied'); copyBtn.innerHTML = COPY_ICON; }, 2000);
});

function showError(msg) { errorBox.textContent = msg; errorBox.style.display = 'block'; }
function hideError()    { errorBox.style.display = 'none'; }

// Init
(async () => {
  await loadSettings();
  await detectJob();
})();