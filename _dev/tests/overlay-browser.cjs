// Local Chromium fixture regression. Set PLAYWRIGHT_MODULE if not installed locally.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..', '..');
const overlay = fs.readFileSync(path.join(root, 'critic-layer/skills/critic-layer/scripts/critic-overlay.js'), 'utf8');
const fixture = fs.readFileSync(path.join(root, 'design-steward/examples/fixture/index.html'), 'utf8');
const output = path.join(root, 'test-results', 'workflow-' + Date.now());
fs.mkdirSync(output, {recursive:true});
fs.writeFileSync(path.join(output, 'index.html'), fixture);
fs.copyFileSync(path.join(root, 'design-steward/examples/fixture/DESIGN.md'), path.join(output, 'DESIGN.md'));
const server = http.createServer((req, res) => { res.setHeader('Content-Type', 'text/html'); res.end(fs.readFileSync(path.join(output, 'index.html'))); });
function python(script, ...args) { return execFileSync(process.env.PYTHON || 'python', [path.join(root, script), ...args], {encoding:'utf8'}); }

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({headless:true, ...(process.env.PLAYWRIGHT_CHANNEL ? {channel:process.env.PLAYWRIGHT_CHANNEL} : {})});
  const page = await browser.newPage({viewport:{width:1280,height:800}});
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  const url = `http://127.0.0.1:${server.address().port}`;
  try {
    await page.goto(url);
    await page.evaluate(overlay);
    await page.locator('#start').click();
    await page.locator('[data-role="note-text"]').fill('Use the approved 8px radius');
    await page.keyboard.press('Enter');
    await page.evaluate(() => window.__CRITIC__.setMode('draw'));
    await page.mouse.move(700,500); await page.mouse.down();
    await page.mouse.move(780,550,{steps:5}); await page.mouse.up();
    await page.evaluate(() => window.__CRITIC__.setMode('edit'));
    await page.locator('#start').click({position:{x:5,y:5}});
    await page.locator('#__critic__editpanel input[placeholder="border-radius"]').fill('8px');
    await page.keyboard.press('Escape');
    let capture = await page.evaluate(() => window.__CRITIC__.export());
    assert.equal(capture.notes.length, 1);
    assert.equal(capture.drawings.length, 1);
    assert.equal(capture.edits.length, 1);
    assert.ok(capture.edits[0].changes.some(c => c.kind==='style' && c.prop==='border-radius' && c.to==='8px'));
    const issueId = capture.notes[0].issueId;
    // Import all three real capture collections, with a non-replay sentinel.
    capture.edits[0].after.html = '<button>Never replay this</button>';
    await page.evaluate(data => window.__CRITIC__.import(data), capture);
    assert.equal(await page.locator('#start').textContent(), 'Get started');
    await page.evaluate(() => window.__CRITIC__.save());
    await page.reload();
    await page.evaluate(overlay);
    const restored = await page.evaluate(() => window.__CRITIC__.export());
    assert.deepEqual(restored.counts, {notes:1,drawings:1,edits:1});
    assert.equal(restored.notes[0].issueId, issueId);
    assert.equal(await page.locator('#start').textContent(), 'Get started');
    assert.equal(await page.locator('#start').evaluate(el => getComputedStyle(el).borderRadius), '6px');
    fs.writeFileSync(path.join(output, 'capture.json'), JSON.stringify(restored,null,2));
    await page.evaluate(() => window.__CRITIC__.hide());
    await page.screenshot({path:path.join(output,'before-desktop.png')});
    await page.evaluate(() => window.__CRITIC__.show());
    // Zombie reinjection retains every collection.
    await page.evaluate(() => document.getElementById('__critic__root').remove());
    await page.evaluate(overlay);
    assert.deepEqual(await page.evaluate(() => window.__CRITIC__.export().counts), {notes:1,drawings:1,edits:1});
    const wrong = {...capture,url:url+'/wrong'};
    await assert.rejects(page.evaluate(data => window.__CRITIC__.import(data), wrong));
    const malformed = {...capture,drawings:[{id:'draw_001',points:[[null,2]]}]};
    await assert.rejects(page.evaluate(data => window.__CRITIC__.import(data), malformed));
    assert.equal(await page.evaluate(() => window.__CRITIC__.notes.length), 1);
    // Two matching nodes must be ambiguous, never silently choose the first.
    assert.equal(await page.evaluate(() => {
      for(let i=0;i<2;i++){const b=document.createElement('button');b.className='duplicate';b.textContent='Same';document.body.appendChild(b);}
      return window.__CRITIC__.resolveAnchor({tag:'button',classes:['duplicate'],text:'Same'});
    }), 'ambiguous');
    // Simulate denied storage without breaking capture/export.
    assert.match(await page.evaluate(() => {
      Storage.prototype.setItem = function(){throw new Error('Storage denied');};
      window.__CRITIC__.notes[0].note = 'Changed';
      return window.__CRITIC__.save();
    }), /unavailable/);
    await page.evaluate(() => window.__CRITIC__.forgetRecovery());
    assert.equal(await page.evaluate(() => window.__CRITIC__.export().recovery), 'disabled');
    await page.evaluate(() => {window.__CRITIC__.clear(); window.__CRITIC__.setMode('pick');});
    await page.locator('h1').click();
    await page.locator('[data-role="note-text"]').fill('A new issue');
    await page.keyboard.press('Enter');
    assert.notEqual(await page.evaluate(() => window.__CRITIC__.export().notes[0].issueId), issueId);
    await page.evaluate(() => window.__CRITIC__.destroy());
    // Complete a source-backed synthetic workflow with shared helpers.
    const runDir=path.join(output,'.design-steward','fixture'); fs.mkdirSync(runDir,{recursive:true});
    const baseline=path.join(runDir,'sources.json');
    python('canon-check/scripts/source_snapshot.py','save',output,baseline);
    const sourceMap=JSON.parse(python('critic-layer/scripts/source_candidates.py',output,path.join(output,'capture.json')));
    assert.ok(sourceMap.issues[0].matches.some(m=>m.path==='index.html'));
    fs.writeFileSync(path.join(runDir,'decisions.json'), JSON.stringify([{issueId,status:'approved',scope:'fixture/button/all-viewports',authority:'Synthetic fixture author',decision:'Use documented 8px radius'}],null,2));
    fs.writeFileSync(path.join(runDir,'brief.md'), `Issue ${issueId}: use the documented radius, preserve full-width mobile behavior and Started interaction. Synthetic author decision.\n`);
    const plan={schemaVersion:1,outcome:'Implement and verify fixture button',steps:[{id:'implement',dependsOn:[],acceptance:'Use documented 8px radius'},{id:'verify',dependsOn:['implement'],acceptance:'390px/1280px behavior passes'}]};
    const planPath=path.join(runDir,'plan.json'), ledger=path.join(runDir,'run.json');
    fs.writeFileSync(planPath,JSON.stringify(plan));
    python('hands-free/scripts/run_state.py','init',ledger,'--plan',planPath,'--root',output);
    fs.writeFileSync(path.join(output,'index.html'),fixture.replace('#start { border-radius: 6px; }','#start { border-radius: var(--radius); }'));
    assert.throws(()=>python('canon-check/scripts/source_snapshot.py','check',output,baseline));
    python('hands-free/scripts/run_state.py','complete',ledger,'--step','implement','--evidence','index.html','--result','Source now uses documented radius token');
    for (const width of [1280,390]) {
      await page.setViewportSize({width,height:800});
      await page.goto(url+'/approved');
      assert.equal(await page.locator('#start').evaluate(el => getComputedStyle(el).borderRadius), '8px');
      if(width===390) assert.equal(await page.locator('#start').evaluate(el => el.getBoundingClientRect().width),358);
      await page.locator('#start').click();
      assert.equal(await page.locator('#result').textContent(), 'Started');
      await page.screenshot({path:path.join(output,`after-${width}.png`)});
    }
    assert.deepEqual(errors, []);
    fs.writeFileSync(path.join(runDir,'verification.md'),`PASS ${issueId}: computed radius 8px at 1280 and 390; mobile width 358px; Started interaction at both sizes. Source-backed synthetic fixture in isolated Edge, not a live Claude bridge or model evaluation.\n`);
    python('hands-free/scripts/run_state.py','complete',ledger,'--step','verify','--evidence','.design-steward/fixture/verification.md','--evidence','index.html','--result','Both viewport and interaction checks passed');
    assert.equal(JSON.parse(python('hands-free/scripts/run_state.py','status',ledger)).complete,true);
    python('canon-check/scripts/source_snapshot.py','save',output,baseline);
    assert.equal(JSON.parse(python('canon-check/scripts/source_snapshot.py','check',output,baseline)).fresh,true);
    console.log('PASS: capture, recovery, stable IDs, no edit replay, zombie reinjection, import rejection, ambiguous anchors, denied storage, desktop/mobile fixture behavior');
    console.log('Evidence: '+output);
  } finally {
    await browser.close();
    server.close();
  }
})().catch(error => { console.error(error); server.close(); process.exitCode=1; });
