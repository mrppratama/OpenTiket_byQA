const fs = require('fs');
const content = fs.readFileSync('c:/Users/ASUS/pratama/OpentiketbyQA/qa_recap_local_app.html', 'utf8');

const scriptMatch = content.match(/<script type="text\/babel">([\s\S]*?)<\/script>/);
if (!scriptMatch) {
    console.log("Could not find <script type=\"text/babel\">");
    process.exit(1);
}

const jsCode = scriptMatch[1];
const babel = require('@babel/core');
try {
    babel.transformSync(jsCode, { presets: ['@babel/preset-react'] });
    console.log('No syntax errors found by Babel!');
} catch (e) {
    console.log('Babel syntax error:');
    console.log(e.message);
}
