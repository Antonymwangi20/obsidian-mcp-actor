import assert from 'assert';
import fs from 'fs/promises';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { extractTags, validateContent, loadTemplateConfig, extractImagesFromHtml } from '../lib/helpers.js';

async function runUnitTests() {
    console.log('Running unit tests...');

    // validateContent tests
    const empty = validateContent(null);
    assert.strictEqual(empty.valid, false, 'null scrapedData should be invalid');

    const short = validateContent({ title: 'Untitled', html: '<p>Hi</p>', text: 'Hi' });
    assert.strictEqual(short.valid, false, 'too short content should be invalid');

    const good = validateContent({ title: 'Hello World', html: '<p>'.padEnd(200, 'a') + '</p>', text: 'Long enough' });
    assert.strictEqual(good.valid, true, 'sufficient content should be valid');

    // extractTags tests with COMMON_KEYWORDS sample
    const sample = {
        url: 'https://example.com/article',
        title: 'Research in AI and Machine Learning',
        metadata: { description: 'An article about artificial intelligence and cloud' },
        text: 'machine learning, artificial intelligence, cloud, technology'
    };
    const tags = extractTags(sample, ['research','artificial intelligence','machine learning','cloud','technology']);
    assert.ok(tags.length >= 1, 'should extract at least one tag');
    assert.ok(tags.includes('machine learning') || tags.includes('artificial intelligence') || tags.includes('cloud'), 'should include relevant tag');

    // loadTemplateConfig test (create temp vault and template)
    const tmpVault = path.join(process.cwd(), 'test-temp-vault');
    await fs.mkdir(tmpVault, { recursive: true });
    const tplPath = path.join(tmpVault, 'templates');
    await fs.mkdir(tplPath, { recursive: true });
    const tplFile = path.join(tplPath, 'test-template.md');
    const fm = `---\nupdateExisting: true\nrateLimitDelay: 1500\ntags: [\"from-template\"]\n---\n`;
    await fs.writeFile(tplFile, fm + '\n# Template');
    const tplConfig = await loadTemplateConfig(tmpVault, 'templates/test-template');
    // The simple parser will have keys updateExisting and rateLimitDelay as strings/numbers
    assert.ok(tplConfig.updateExisting === true || tplConfig.updateExisting === 'true', 'template should include updateExisting');

    // extractImagesFromHtml test
    const html = '<html><body><img src="/img/foo.png" alt="foo"><img src="https://example.com/bar.jpg"></body></html>';
    const imgs = extractImagesFromHtml(html);
    assert.strictEqual(imgs.length, 2, 'should extract two images');

    console.log('Unit tests passed');
}

async function runIntegrationTest() {
    console.log('Running integration test (fast mode)...');
    const tempVault = path.join(process.cwd(), 'test-integration-vault');
    await fs.rm(tempVault, { recursive: true, force: true });
    await fs.mkdir(tempVault, { recursive: true });

    // create input.json for integration
    const input = {
        "urls": [
            "https://simple-authx-lp.vercel.app",
            "https://example.com",
            "https://www.design.com/website-builder?code=webmasem&utm_medium=cpc&utm_source=google&utm_campaign=row_website_builder_ai_max&utm_adgroup=websites&utm_content=768598867564&utm_keyword=site+creator&utm_network=g&gad_source=1&gad_campaignid=21716717486&gclid=EAIaIQobChMIyOWWrv70kAMVUqb9BR1xgR2_EAAYAyAAEgLnJ_D_BwE"
        ],
    // Use the temporary vault created for tests so CI doesn't write to user folders
    "vaultPath": tempVault,
    // Keep notes inside the test vault under 'scraped' to match assertions below
    "folderPath": "scraped",
        "addMetadata": true,
        "tags": ["test"],
        "autoTag": true,
        "bulkMode": true,
        "autoLink": false,
        "updateExisting": true,
        "rateLimitDelay": 500,
        "downloadImages": true,
        // Disable Playwright in CI tests (browsers may not be installed). Tests use Cheerio mode.
        "usePlaywright": false
    };
    const inputFile = path.join(process.cwd(), 'input.json');
    await fs.writeFile(inputFile, JSON.stringify(input, null, 2));

    // run main.js (synchronous)
    const res = spawnSync('node', ['main.js'], { encoding: 'utf-8' });
    console.log('Integration stdout:', res.stdout.slice(-400));
    console.log('Integration stderr:', res.stderr.slice(-400));
    if (res.error) throw res.error;

    // Check that a note was created
    const scrapedDir = path.join(tempVault, 'scraped');
    const files = await fs.readdir(scrapedDir);
    assert.ok(files.length >= 1, 'At least one note created in integration test');

    console.log('Integration test passed');
}

(async () => {
    try {
        await runUnitTests();
        await runIntegrationTest();
        console.log('\nALL TESTS PASSED');
        process.exit(0);
    } catch (err) {
        console.error('TESTS FAILED:', err);
        process.exit(2);
    }
})();
