const fs = require('fs');
const babel = require('@babel/core');

try {
  const html = fs.readFileSync('index.html', 'utf8');
  const match = html.match(/<script type="text\/babel">([\s\S]*?)<\/script>/);
  if (!match) {
    console.error('Could not find script tag');
    process.exit(1);
  }
  const script = match[1];
  babel.transformSync(script, {
    presets: ['@babel/preset-react'],
    filename: 'index.jsx'
  });
  console.log('Syntax OK');
} catch (e) {
  console.error(e.message);
}
