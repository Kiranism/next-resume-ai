/**
 * Generate the resume-template cover thumbnails in public/templates.
 *
 * For every template in the registry it renders the component (filled with a
 * complete placeholder resume) to a PDF via @react-pdf/renderer, rasterizes
 * page 1 with pdfjs-dist inside headless Chrome, and writes the PNG to
 * public/templates/<template-id>.png.
 *
 * Run it whenever a template's design changes:
 *
 *     pnpm covers:generate
 *
 * Requirements: a Chromium-based browser (auto-detected; override with
 * CHROME_PATH) and the project's dev dependencies installed.
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import * as esbuild from 'esbuild';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TEMPLATES_DIR = path.join(ROOT, 'src/features/resume/templates');
const PUBLIC_TEMPLATES = path.join(ROOT, 'public/templates');
const WIDTH = 1000; // canvas CSS width; height derives from the A4 aspect ratio

// Templates to render → output file name (matches registry `thumbnail` paths).
const TEMPLATES = [
  ['template-one', 'templateOne'],
  ['template-two', 'templateTwo'],
  ['template-three', 'templateThree'],
  ['template-four', 'templateFour'],
  ['template-five', 'templateFive'],
  ['template-six', 'templateSix'],
  ['template-seven', 'templateSeven'],
  ['template-eight', 'templateEight']
];

// Optional CLI filter: `node scripts/generate-template-covers.mjs template-six`
// renders only the given template id(s) — fast when iterating on one template.
// No args → render everything.
const ONLY = process.argv.slice(2).filter((a) => !a.startsWith('-'));
const SELECTED = ONLY.length
  ? TEMPLATES.filter(([id]) => ONLY.includes(id))
  : TEMPLATES;
if (ONLY.length && SELECTED.length === 0) {
  console.error(
    `No template matches: ${ONLY.join(', ')}\nKnown ids: ${TEMPLATES.map((t) => t[0]).join(', ')}`
  );
  process.exit(1);
}

// A complete placeholder resume that exercises every field a template renders.
const PLACEHOLDER = {
  personal_details: {
    resume_job_title: 'Senior Software Engineer',
    fname: 'Ethan',
    lname: 'Carter',
    email: 'ethan.carter@example.com',
    phone: '+1 (415) 555-0198',
    city: 'San Francisco',
    country: 'USA',
    linkedin: 'linkedin.com/in/ethancarter',
    github: 'github.com/ethancarter',
    website: 'ethancarter.dev',
    summary:
      'Senior Software Engineer with 8+ years building and shipping production web applications with React, TypeScript, and Node.js. Led 0-to-1 initiatives across fintech and developer tools, improved page performance by 40%, and mentored teams of 6+ engineers. Passionate about clean architecture and a delightful user experience.'
  },
  jobs: [
    {
      jobTitle: 'Senior Software Engineer',
      employer: 'TechNova Solutions',
      city: 'San Francisco',
      startDate: '2021-01-01',
      endDate: '2025-01-01',
      description:
        'Led development of a microservices platform serving 2M+ users.\nBuilt CI/CD pipelines that cut deployment time by 60%.\nMentored 6 engineers and drove TypeScript adoption across teams.'
    },
    {
      jobTitle: 'Software Engineer',
      employer: 'BlueWave Technologies',
      city: 'Austin',
      startDate: '2017-06-01',
      endDate: '2020-12-31',
      description:
        'Built customer-facing React apps and secure authentication flows.\nIntegrated payment gateways and optimized SQL queries, cutting p95 latency by 35%.'
    },
    {
      jobTitle: 'Associate Engineer',
      employer: 'Innovex Software',
      city: 'Seattle',
      startDate: '2015-07-01',
      endDate: '2017-05-31',
      description:
        'Developed responsive interfaces and wrote unit and integration tests.\nShipped internal tools used by 200+ staff.'
    }
  ],
  educations: [
    {
      school: 'University of California, Berkeley',
      degree: 'B.S.',
      field: 'Computer Science',
      city: 'Berkeley',
      startDate: '2011-08-01',
      endDate: '2015-05-31',
      description:
        'Graduated with Honors.\nPresident of the ACM student chapter.'
    },
    {
      school: 'Lincoln High School',
      degree: 'High School Diploma',
      field: 'Science',
      city: 'Portland',
      startDate: '2009-06-01',
      endDate: '2011-05-31',
      description: ''
    }
  ],
  projects: [
    {
      name: 'Open Source Collaboration Tool',
      link: 'github.com/ethancarter/collab',
      description:
        'Real-time collaboration app in React + TypeScript with 500+ GitHub stars.'
    },
    {
      name: 'AI Resume Tailor',
      link: 'github.com/ethancarter/tailor',
      description:
        'LLM-powered resume optimizer that tailors resumes to a job description.'
    },
    {
      name: 'Realtime Chat SDK',
      link: 'github.com/ethancarter/chat',
      description: 'WebSocket chat SDK adopted by several early-stage startups.'
    }
  ],
  skills: [
    'TypeScript',
    'JavaScript',
    'React',
    'Next.js',
    'Node.js',
    'GraphQL',
    'PostgreSQL',
    'AWS',
    'Docker',
    'System Design'
  ].map((s) => ({ skill_name: s, proficiency_level: 'Advanced' })),
  tools: ['VS Code', 'Git', 'Figma', 'Jira', 'Postman', 'Datadog'].map((t) => ({
    tool_name: t,
    proficiency_level: 'Advanced'
  })),
  languages: [
    { lang_name: 'English', proficiency_level: 'Native' },
    { lang_name: 'Spanish', proficiency_level: 'Fluent' },
    { lang_name: 'German', proficiency_level: 'Basic' }
  ],
  hiddenSections: []
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function findChrome() {
  if (process.env.CHROME_PATH && fs.existsSync(process.env.CHROME_PATH))
    return process.env.CHROME_PATH;
  const candidates = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/microsoft-edge'
  ];
  const found = candidates.find((p) => fs.existsSync(p));
  if (!found)
    throw new Error(
      'No Chromium-based browser found. Set CHROME_PATH to a Chrome/Chromium binary.'
    );
  return found;
}

// ---- step 1: render each template component to a PDF -----------------------
async function renderPdfs(outDir) {
  const entryFile = path.join(ROOT, '.covers-render.entry.tsx');
  const bundleFile = path.join(ROOT, '.covers-render.cjs');
  const imports = SELECTED.map(
    ([, comp], i) =>
      `import T${i} from ${JSON.stringify(path.join(TEMPLATES_DIR, comp))};`
  ).join('\n');
  const renders = SELECTED.map(
    ([id], i) =>
      `  await renderToFile(<T${i} formData={data} />, ${JSON.stringify(
        path.join(outDir, id + '.pdf')
      )});`
  ).join('\n');
  const entry = `import { renderToFile, Font } from '@react-pdf/renderer';
// Match the app: registry.ts disables hyphenation, but this bundle imports the
// template components directly, so register the same callback here too.
Font.registerHyphenationCallback((w) => [w]);
${imports}
const data = ${JSON.stringify(PLACEHOLDER)};
(async () => {
${renders}
})().catch((e) => { console.error(e); process.exit(1); });
`;
  fs.writeFileSync(entryFile, entry);
  try {
    await esbuild.build({
      entryPoints: [entryFile],
      outfile: bundleFile,
      bundle: true,
      platform: 'node',
      format: 'cjs',
      jsx: 'automatic',
      packages: 'external',
      logLevel: 'error'
    });
    await new Promise((resolve, reject) => {
      const cp = spawn(process.execPath, [bundleFile], {
        stdio: 'inherit',
        cwd: ROOT
      });
      cp.on('exit', (code) =>
        code === 0 ? resolve() : reject(new Error(`render exited ${code}`))
      );
    });
  } finally {
    fs.rmSync(entryFile, { force: true });
    fs.rmSync(bundleFile, { force: true });
  }
}

// ---- step 2: rasterize page 1 of each PDF to PNG via headless Chrome + CDP --
function pageHtml(id) {
  return `<!doctype html><html><head><meta charset="utf-8">
<style>html,body{margin:0;padding:0;background:#fff}canvas{display:block}</style>
</head><body><script type="module">
import * as pdfjs from '/pdfjs/pdf.min.mjs';
pdfjs.GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.min.mjs';
(async () => {
  const doc = await pdfjs.getDocument('/pdf/${id}.pdf').promise;
  const page = await doc.getPage(1);
  const base = page.getViewport({ scale: 1 });
  const viewport = page.getViewport({ scale: ${WIDTH} / base.width });
  const canvas = document.createElement('canvas');
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);
  document.body.appendChild(canvas);
  await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
  window.__result = { w: canvas.width, h: canvas.height };
  document.title = 'READY';
})().catch((e) => { window.__result = { error: String(e && e.message || e) }; document.title = 'ERROR'; });
</script></body></html>`;
}

class CDP {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result);
      }
    });
  }
  send(method, params = {}, sessionId) {
    const id = ++this.id;
    const payload = { id, method, params };
    if (sessionId) payload.sessionId = sessionId;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify(payload));
    });
  }
}

async function rasterize(pdfDir) {
  const reqFromReactPdf = createRequire(require.resolve('react-pdf/package.json'));
  const pdfjsBuild = path.dirname(
    reqFromReactPdf.resolve('pdfjs-dist/build/pdf.min.mjs')
  );

  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://x');
    const p = url.pathname;
    try {
      if (p === '/page.html') {
        res.setHeader('content-type', 'text/html');
        res.end(pageHtml(url.searchParams.get('id')));
      } else if (p.startsWith('/pdfjs/')) {
        res.setHeader('content-type', 'text/javascript');
        res.end(fs.readFileSync(path.join(pdfjsBuild, p.slice('/pdfjs/'.length))));
      } else if (p.startsWith('/pdf/')) {
        res.setHeader('content-type', 'application/pdf');
        res.end(fs.readFileSync(path.join(pdfDir, p.slice('/pdf/'.length))));
      } else {
        res.statusCode = 404;
        res.end('nope');
      }
    } catch (e) {
      res.statusCode = 500;
      res.end(String(e));
    }
  });
  const port = await new Promise((resolve) =>
    server.listen(0, '127.0.0.1', () => resolve(server.address().port))
  );

  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'covers-chrome-'));
  const chrome = spawn(
    findChrome(),
    [
      '--headless=new',
      '--disable-gpu',
      '--no-first-run',
      '--no-default-browser-check',
      '--hide-scrollbars',
      '--force-device-scale-factor=1',
      '--remote-debugging-port=0',
      `--user-data-dir=${profile}`,
      'about:blank'
    ],
    { stdio: 'ignore', detached: true }
  );
  const killChrome = () => {
    try {
      process.kill(-chrome.pid, 'SIGKILL');
    } catch {
      /* already gone */
    }
  };

  try {
    // discover the CDP port Chrome chose
    const portFile = path.join(profile, 'DevToolsActivePort');
    let dtPort;
    for (let i = 0; i < 100 && !dtPort; i++) {
      if (fs.existsSync(portFile)) {
        const line = fs.readFileSync(portFile, 'utf8').split('\n')[0].trim();
        if (line) dtPort = Number(line);
      }
      if (!dtPort) await sleep(100);
    }
    if (!dtPort) throw new Error('Chrome did not expose a DevTools port');

    const ver = await (
      await fetch(`http://127.0.0.1:${dtPort}/json/version`)
    ).json();
    const ws = await new Promise((resolve, reject) => {
      const s = new WebSocket(ver.webSocketDebuggerUrl);
      s.addEventListener('open', () => resolve(s));
      s.addEventListener('error', (e) => reject(new Error('ws error ' + e.message)));
    });
    const cdp = new CDP(ws);

    fs.mkdirSync(PUBLIC_TEMPLATES, { recursive: true });
    for (const [id] of SELECTED) {
      const { targetId } = await cdp.send('Target.createTarget', {
        url: 'about:blank'
      });
      const { sessionId } = await cdp.send('Target.attachToTarget', {
        targetId,
        flatten: true
      });
      await cdp.send('Page.enable', {}, sessionId);
      await cdp.send('Runtime.enable', {}, sessionId);
      await cdp.send(
        'Page.navigate',
        { url: `http://127.0.0.1:${port}/page.html?id=${id}` },
        sessionId
      );

      let state = '';
      for (let i = 0; i < 150 && state !== 'READY' && state !== 'ERROR'; i++) {
        const { result } = await cdp.send(
          'Runtime.evaluate',
          { expression: 'document.title', returnByValue: true },
          sessionId
        );
        state = result.value;
        if (state !== 'READY' && state !== 'ERROR') await sleep(100);
      }
      const { result: meta } = await cdp.send(
        'Runtime.evaluate',
        { expression: 'JSON.stringify(window.__result||{})', returnByValue: true },
        sessionId
      );
      const info = JSON.parse(meta.value || '{}');
      if (state !== 'READY')
        throw new Error(`render failed for ${id}: ${meta.value}`);

      const { data } = await cdp.send(
        'Page.captureScreenshot',
        {
          format: 'png',
          clip: { x: 0, y: 0, width: info.w, height: info.h, scale: 1 },
          captureBeyondViewport: true
        },
        sessionId
      );
      const out = path.join(PUBLIC_TEMPLATES, `${id}.png`);
      fs.writeFileSync(out, Buffer.from(data, 'base64'));
      console.log(`✓ ${id}.png  (${info.w}×${info.h})`);
      await cdp.send('Target.closeTarget', { targetId });
    }
    ws.close();
  } finally {
    killChrome();
    server.close();
    fs.rmSync(profile, { recursive: true, force: true });
  }
}

async function main() {
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'covers-pdf-'));
  try {
    console.log('Rendering template PDFs…');
    await renderPdfs(workDir);
    console.log('Rasterizing to PNG via headless Chrome…');
    await rasterize(workDir);
    console.log(`Done. Covers written to ${path.relative(ROOT, PUBLIC_TEMPLATES)}/`);
  } finally {
    fs.rmSync(workDir, { recursive: true, force: true });
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
