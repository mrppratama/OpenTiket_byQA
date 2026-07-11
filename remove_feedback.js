const fs = require('fs');
let code = fs.readFileSync('qa_recap_local_app.html', 'utf8');

// 1. Remove feedback from TicketDetailModal rendering
code = code.replace(
    /                                \{\(currentUser\?\.role === 'Admin' \|\| currentUser\?\.role === 'Tim IT' \|\| ticket\.feedback\) && \([\s\S]*?                                \)\}/,
    ""
);

// 2. Remove feedback from editForm state in TicketDetailModal
code = code.replace(
    /const \[editForm, setEditForm\] = useState\(\{ status: '', priority: '', assignee: '', deadline: '', feedback: '' \}\);/,
    "const [editForm, setEditForm] = useState({ status: '', priority: '', assignee: '', deadline: '' });"
);

// 3. Remove feedback from effect in TicketDetailModal
code = code.replace(
    /deadline: ticket\.deadline \? ticket\.deadline\.split\('T'\)\[0\] : '',\s*feedback: ticket\.feedback \|\| ''/,
    "deadline: ticket.deadline ? ticket.deadline.split('T')[0] : ''"
);

// 4. Remove feedback logic from UserDashboard notifications
code = code.replace(
    /const notifTickets = myTickets\.filter\(t => t\.feedback \|\| \(t\.status !== 'Open' && t\.status !== 'Done'\)\);/,
    "const notifTickets = myTickets.filter(t => t.status !== 'Open' && t.status !== 'Done');"
);
code = code.replace(
    /<div className="text-xs text-slate-600 dark:text-slate-300 line-clamp-1 mb-1">\{t\.feedback \? 'Ada balasan\/feedback baru' : `Status update: \$\{t\.status\}`\}<\/div>/,
    '<div className="text-xs text-slate-600 dark:text-slate-300 line-clamp-1 mb-1">Status update: {t.status}</div>'
);

// 5. Save changes
fs.writeFileSync('qa_recap_local_app.html', code);
console.log('Feedback feature removed successfully');
