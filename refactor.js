const fs = require('fs');
let html = fs.readFileSync('c:/Users/ASUS/pratama/OpentiketbyQA/qa_recap_local_app.html', 'utf8');

// 1. Add chevron-down icon
const iconTarget = `'shield-check':`;
if (!html.includes("'chevron-down':")) {
    html = html.replace(iconTarget, `'chevron-down': <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />,\n                'check': <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />,\n                ` + iconTarget);
}

// 2. Add CustomDropdown component
const dropdownComponent = `
        const CustomDropdown = ({ options, value, onChange, label, disabled = false, className = "" }) => {
            const [isOpen, setIsOpen] = useState(false);
            const wrapperRef = useRef(null);

            useEffect(() => {
                function handleClickOutside(event) {
                    if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                        setIsOpen(false);
                    }
                }
                document.addEventListener("mousedown", handleClickOutside);
                return () => document.removeEventListener("mousedown", handleClickOutside);
            }, [wrapperRef]);

            return (
                <div ref={wrapperRef} className={\`relative \${className}\`}>
                    {label && <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{label}</label>}
                    <div 
                        className={\`w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-transparent flex justify-between items-center cursor-pointer transition-colors \${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary'} \${isOpen ? 'border-primary ring-2 ring-primary/20' : ''}\`}
                        onClick={() => !disabled && setIsOpen(!isOpen)}
                    >
                        <span className="truncate">{value || 'Pilih...'}</span>
                        <Icon name="chevron-down" size={16} className={\`transition-transform text-slate-400 \${isOpen ? 'rotate-180 text-primary' : ''}\`} />
                    </div>
                    {isOpen && !disabled && (
                        <ul className="absolute z-50 w-full mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl max-h-60 overflow-y-auto py-1 fade-in">
                            {options.map((opt, i) => {
                                const optValue = typeof opt === 'object' ? opt.value : opt;
                                const optLabel = typeof opt === 'object' ? opt.label : opt;
                                const isSelected = value === optValue;
                                return (
                                    <li 
                                        key={i}
                                        className={\`px-4 py-2.5 cursor-pointer text-sm flex items-center justify-between transition-colors \${isSelected ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-300'}\`}
                                        onClick={() => {
                                            onChange(optValue);
                                            setIsOpen(false);
                                        }}
                                    >
                                        <span className="truncate">{optLabel}</span>
                                        {isSelected && <Icon name="check" size={16} className="text-primary flex-shrink-0" />}
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            );
        };
`;

if (!html.includes("const CustomDropdown")) {
    const insertPos = html.indexOf("const toBase64 =");
    html = html.substring(0, insertPos) + dropdownComponent + "\n" + html.substring(insertPos);
}

// 3. Replace <select> in TicketDetailModal
// Priority
const tdmPriorityOld = `<select
                                    className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 focus:outline-none focus:border-primary"
                                    value={editForm.priority}
                                    onChange={e => setEditForm({ ...editForm, priority: e.target.value })}
                                >
                                    {settings.priorities.map(p => <option key={p} value={p}>{p}</option>)}
                                </select>`;
const tdmPriorityNew = `<CustomDropdown
                                    options={settings.priorities}
                                    value={editForm.priority}
                                    onChange={val => setEditForm({ ...editForm, priority: val })}
                                />`;
html = html.replace(tdmPriorityOld, tdmPriorityNew);

// Status
const tdmStatusOld = `<select
                                    className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 focus:outline-none focus:border-primary"
                                    value={editForm.status}
                                    onChange={e => setEditForm({ ...editForm, status: e.target.value })}
                                >
                                    {settings.statuses.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>`;
const tdmStatusNew = `<CustomDropdown
                                    options={settings.statuses}
                                    value={editForm.status}
                                    onChange={val => setEditForm({ ...editForm, status: val })}
                                />`;
html = html.replace(tdmStatusOld, tdmStatusNew);

// Assignee
const tdmAssigneeOld = `<select
                                        className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 focus:outline-none focus:border-primary"
                                        value={editForm.assignee}
                                        onChange={e => setEditForm({ ...editForm, assignee: e.target.value })}
                                    >
                                        <option value="">Belum ada</option>
                                        {users.filter(u => u.role !== 'User').map(u => (
                                            <option key={u.username} value={u.name}>{u.name}</option>
                                        ))}
                                    </select>`;
const tdmAssigneeNew = `<CustomDropdown
                                        options={[{label: 'Belum ada', value: ''}, ...users.filter(u => u.role !== 'User').map(u => ({label: u.name, value: u.name}))]}
                                        value={editForm.assignee}
                                        onChange={val => setEditForm({ ...editForm, assignee: val })}
                                    />`;
html = html.replace(tdmAssigneeOld, tdmAssigneeNew);

// 4. Replace <select> in UserDashboard
// App
const udAppOld = `<select required className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-transparent focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary" value={form.app} onChange={e => setForm({ ...form, app: e.target.value })}>
                                        <option value="" disabled>Pilih Aplikasi</option>
                                        {settings.apps.map(a => <option key={a} value={a}>{a}</option>)}
                                    </select>`;
// Need to extract the logic to change custom dropdown
const udAppNew = `<CustomDropdown
                                        options={settings.apps}
                                        value={form.app}
                                        onChange={val => setForm({ ...form, app: val })}
                                    />`;
// Wait, the CustomDropdown doesn't have native required support. 
// For form submission, we might need a hidden input or just let React handle it. 
// Since it's a controlled component in a custom form submit, we might need to add validation manually.
html = html.replace(udAppOld, udAppNew);

// Priority in UserDashboard
const udPriorityOld = `<select className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-transparent focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
                                        {settings.priorities.map(p => <option key={p} value={p}>{p}</option>)}
                                    </select>`;
const udPriorityNew = `<CustomDropdown
                                        options={settings.priorities}
                                        value={form.priority}
                                        onChange={val => setForm({ ...form, priority: val })}
                                    />`;
html = html.replace(udPriorityOld, udPriorityNew);


// 5. Replace <select> in AdminDashboard User form
const adRoleOld = `<select className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 focus:outline-none focus:border-primary" value={userForm.role} onChange={e => setUserForm({ ...userForm, role: e.target.value })}>
                                            <option value="User">User</option>
                                            <option value="Admin">Admin</option>
                                            <option value="Tim IT">Tim IT</option>
                                        </select>`;
const adRoleNew = `<CustomDropdown
                                            options={['User', 'Admin', 'Tim IT']}
                                            value={userForm.role}
                                            onChange={val => setUserForm({ ...userForm, role: val })}
                                        />`;
html = html.replace(adRoleOld, adRoleNew);

const adStatusOld = `<select className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 focus:outline-none focus:border-primary" value={userForm.status} onChange={e => setUserForm({ ...userForm, status: e.target.value })}>
                                            <option value="Active">Aktif</option>
                                            <option value="Inactive">Tidak Aktif</option>
                                        </select>`;
const adStatusNew = `<CustomDropdown
                                            options={[{label: 'Aktif', value: 'Active'}, {label: 'Tidak Aktif', value: 'Inactive'}]}
                                            value={userForm.status}
                                            onChange={val => setUserForm({ ...userForm, status: val })}
                                        />`;
html = html.replace(adStatusOld, adStatusNew);

// 6. Fix TicketDetailModal missing settings in AdminDashboard
const missingSettingsOld = `<TicketDetailModal
                        ticket={selectedTicket}
                        onClose={() => setSelectedTicket(null)}
                        currentUser={currentUser}
                        users={users}
                        onUpdate={async (ticketId, updateData) => {`;
const missingSettingsNew = `<TicketDetailModal
                        ticket={selectedTicket}
                        onClose={() => setSelectedTicket(null)}
                        currentUser={currentUser}
                        users={users}
                        settings={settings}
                        onUpdate={async (ticketId, updateData) => {`;
html = html.replace(missingSettingsOld, missingSettingsNew);

// 7. Add assignee to Kanban card
const cardOld = `<div className="mt-3 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                                                                <div className="flex items-center gap-1">
                                                                    <Icon name="clock" size={14} />
                                                                    <span>{new Date(t.date).toLocaleDateString()}</span>
                                                                </div>`;
const cardNew = `<div className="mt-3 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                                                                <div className="flex flex-col gap-1">
                                                                    <div className="flex items-center gap-1">
                                                                        <Icon name="clock" size={14} />
                                                                        <span>{new Date(t.date).toLocaleDateString()}</span>
                                                                    </div>
                                                                    {t.assignee && (
                                                                        <div className="flex items-center gap-1 text-primary">
                                                                            <Icon name="users" size={14} />
                                                                            <span className="font-medium">{t.assignee}</span>
                                                                        </div>
                                                                    )}
                                                                </div>`;
html = html.replace(cardOld, cardNew);

// Fix onSubmit for UserDashboard form manually if form.app is empty because required is gone
const submitOld = `const handleSubmit = async (e) => {
                e.preventDefault();
                setIsSubmitting(true);`;
const submitNew = `const handleSubmit = async (e) => {
                e.preventDefault();
                if (!form.app) {
                    showToast('Silakan pilih Aplikasi!', 'error');
                    return;
                }
                setIsSubmitting(true);`;
html = html.replace(submitOld, submitNew);

fs.writeFileSync('c:/Users/ASUS/pratama/OpentiketbyQA/qa_recap_local_app.html', html);
console.log('Refactor completed successfully!');
