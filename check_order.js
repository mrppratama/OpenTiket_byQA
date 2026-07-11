const fs = require('fs');
const content = fs.readFileSync('c:/Users/ASUS/pratama/OpentiketbyQA/qa_recap_local_app.html', 'utf8');

const TICKET_STATUSES_index = content.indexOf('TICKET_STATUSES');
console.log('TICKET_STATUSES found at:', TICKET_STATUSES_index);

const appIndex = content.indexOf('function App()');
console.log('function App() found at:', appIndex);

if (TICKET_STATUSES_index > appIndex) {
    console.log('WARNING: TICKET_STATUSES is declared AFTER App()!!!');
}

const adminDashboardIndex = content.indexOf('const AdminDashboard =');
console.log('AdminDashboard found at:', adminDashboardIndex);

const PRIORITIES_index = content.indexOf('const PRIORITIES =');
console.log('PRIORITIES found at:', PRIORITIES_index);
