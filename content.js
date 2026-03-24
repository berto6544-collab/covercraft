// content.js – Multi-site job extractor
// Supports: seek.com.au, indeed.com, jora.com, glassdoor.com, linkedin.com

//Site detection
function getSite() {
  const host = window.location.hostname;
  if (host.includes('seek.com.au'))   return 'seek';
  if (host.includes('indeed.com'))    return 'indeed';
  if (host.includes('jora.com'))      return 'jora';
  if (host.includes('glassdoor.com')) return 'glassdoor';
  if (host.includes('linkedin.com'))  return 'linkedin';
  return 'unknown';
}

//Helper: first matching element text
function getText(...selectors) {
  for (const sel of selectors) {
    try {
      const el = document.querySelector(sel);
      if (el && el.innerText.trim()) return el.innerText.trim();
    } catch (_) {}
  }
  return '';
}

//Helper: largest text block fallback
function largestBlock(...selectors) {
  let best = '';
  for (const sel of selectors) {
    try {
      document.querySelectorAll(sel).forEach(el => {
        const t = el.innerText.trim();
        if (t.length > best.length) best = t;
      });
    } catch (_) {}
  }
  return best;
}

//SEEK
function extractSeek() {
  return {
    site: 'Seek',
    title: getText(
      '[data-automation="job-detail-title"]',
      'h1[class*="title"]',
      'h1'
    ),
    company: getText(
      '[data-automation="advertiser-name"]',
      'span[data-automation="job-detail-company"]',
      'a[data-automation="job-detail-company"]'
    ),
    location: getText(
      '[data-automation="job-detail-location"]',
      'span[data-automation="job-detail-work-type-location"]',
      '[data-automation="job-detail-classifications"] span'
    ),
    description: getText(
      '[data-automation="jobAdDetails"]',
      '[class*="jobDescription"]',
      '.job-description',
      'section[aria-label="Job details"]'
    ) || largestBlock('section', 'article'),
  };
}

//INDEED
function extractIndeed() {
  return {
    site: 'Indeed',
    title: getText(
      'h1.jobsearch-JobInfoHeader-title',
      'h1[data-testid="simpler-jobTitle"]',
      '.jobsearch-JobInfoHeader-title',
      'h1'
    ),
    company: getText(
      '[data-testid="inlineHeader-companyName"] a',
      '[data-testid="inlineHeader-companyName"]',
      '.jobsearch-InlineCompanyRating div:first-child',
      '.css-1ioi40n',
      '[data-company-name]'
    ),
    location: getText(
      '[data-testid="job-location"]',
      '.jobsearch-JobInfoHeader-subtitle div:last-child',
      '[data-testid="inlineHeader-companyLocation"]',
      '.css-6z8o9s'
    ),
    description: getText(
      '#jobDescriptionText',
      '.jobsearch-jobDescriptionText',
      '[data-testid="jobsearch-JobComponent-description"]',
      '.job-snippet'
    ) || largestBlock('section', 'article', '#jobDescriptionText'),
  };
}

//JORA
function extractJora() {
  return {
    site: 'Jora',
    title: getText(
      'h1.job-title',
      'h1[class*="title"]',
      '.job-header h1',
      'h1'
    ),
    company: getText(
      '.company-name',
      '.job-company',
      '[class*="company"]',
      'a[data-automation="company-link"]'
    ),
    location: getText(
      '.job-location',
      '[class*="location"]',
      '.location-text'
    ),
    description: getText(
      '.job-description',
      '[class*="description"]',
      '.job-details',
      '#job-description'
    ) || largestBlock('section', 'article', 'div[class*="description"]'),
  };
}

// ─── GLASSDOOR ────────────────────────────────────────────────────────────────
function extractGlassdoor() {
  return {
    site: 'Glassdoor',
    title: getText(
      'h1[data-test="job-title"]',
      '.job-title',
      'h1[class*="title"]',
      'h1'
    ),
    company: getText(
      '[data-test="employer-name"]',
      '.employer-name',
      '[class*="EmployerProfile"] h4',
      '[class*="employerName"]'
    ),
    location: getText(
      '[data-test="location"]',
      '.location',
      '[class*="location"]'
    ),
    description: getText(
      '[class*="JobDetails_jobDescription"]',
      '[class*="jobDescriptionContent"]',
      '#JobDescriptionContainer',
      '[data-test="jobDescriptionContent"]',
      '.desc'
    ) || largestBlock('div[class*="description"]', 'section', 'article'),
  };
}

// ─── LINKEDIN ─────────────────────────────────────────────────────────────────
function extractLinkedIn() {
  // LinkedIn lazy-loads description; try to click "see more" if present
  try {
    const seeMore = document.querySelector(
      'button.jobs-description__footer-button,' +
      'button[aria-label*="see more"],' +
      '.jobs-description__content button'
    );
    if (seeMore) seeMore.click();
  } catch (_) {}

  return {
    site: 'LinkedIn',
    title: getText(
      'h1.job-details-jobs-unified-top-card__job-title',
      'h1.t-24',
      '.job-details-jobs-unified-top-card__job-title h1',
      'h1[class*="title"]',
      'h1'
    ),
    company: getText(
      '.job-details-jobs-unified-top-card__company-name a',
      '.job-details-jobs-unified-top-card__company-name',
      'a[data-tracking-control-name="public_jobs_topcard-org-name"]',
      '.topcard__org-name-link',
      '[class*="companyName"]'
    ),
    location: getText(
      '.job-details-jobs-unified-top-card__bullet',
      '.job-details-jobs-unified-top-card__primary-description-without-tagline span',
      '.topcard__flavor--bullet',
      '[class*="workplace-type"]'
    ),
    description: getText(
      '.jobs-description__content .jobs-box__html-content',
      '.jobs-description-content__text',
      '#job-details',
      '.description__text',
      '[class*="description__text"]'
    ) || largestBlock(
      '.jobs-description',
      'div[class*="description"]',
      'section[class*="description"]'
    ),
  };
}

// ─── Main extractor ───────────────────────────────────────────────────────────
function extractJobDetails() {
  const site = getSite();
  let details;

  switch (site) {
    case 'seek':      details = extractSeek();      break;
    case 'indeed':    details = extractIndeed();    break;
    case 'jora':      details = extractJora();      break;
    case 'glassdoor': details = extractGlassdoor(); break;
    case 'linkedin':  details = extractLinkedIn();  break;
    default:
      details = { site: 'Unknown', title: '', company: '', location: '', description: '' };
  }

  // Last-resort fallback for description
  if (!details.description || details.description.length < 100) {
    details.description = largestBlock('main', 'article', 'section', 'div[role="main"]');
  }

  return { ...details, url: window.location.href };
}

// ─── Message listener ─────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getJobDetails') {
    const details = extractJobDetails();
    sendResponse(details);
  }
  return true;
});

