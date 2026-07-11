const fs = require('fs');
let code = fs.readFileSync('qa_recap_local_app.html', 'utf8');

// Replace the invalid JSX part
code = code.replace(
    /                                \)\}\s*                                    <\/div>\s*                                \)\}\s*                            <\/div>/,
    "                                )}\n                            </div>"
);

fs.writeFileSync('qa_recap_local_app.html', code);
console.log('Fixed invalid JSX');
