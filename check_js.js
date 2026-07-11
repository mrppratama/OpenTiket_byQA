
const fs = require('fs');
const content = fs.readFileSync('c:/Users/ASUS/pratama/OpentiketbyQA/qa_recap_local_app.html', 'utf8');

const scriptMatch = content.match(/<script type="text\/babel">([\s\S]*?)<\/script>/);
if (!scriptMatch) {
    console.log('No babel script found!');
    process.exit(1);
}

let jsCode = scriptMatch[1];
// Strip JSX tags to prevent Acorn from throwing JSX parse errors
// Wait, Acorn doesn't support JSX natively without a plugin. 
// Let's just use Babel!

