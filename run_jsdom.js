const jsdom = require('jsdom');
const { JSDOM } = jsdom;
const fs = require('fs');
const html = fs.readFileSync('c:/Users/ASUS/pratama/OpentiketbyQA/qa_recap_local_app.html', 'utf8');

const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    resources: 'usable'
});

dom.window.console.log = (...args) => console.log('[Browser LOG]', ...args);
dom.window.console.error = (...args) => console.error('[Browser ERROR]', ...args);
dom.window.console.warn = (...args) => console.warn('[Browser WARN]', ...args);

dom.window.addEventListener('error', (event) => {
    console.error('[Browser Uncaught Error]', event.error);
});

setTimeout(() => {
    console.log('Finished waiting 5 seconds. Exiting.');
    process.exit(0);
}, 5000);
