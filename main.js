// Handle GitHub Pages SPA routing
if (sessionStorage.redirect) {
    const redirect = sessionStorage.redirect;
    delete sessionStorage.redirect;
    window.location.replace(redirect);
}

// main.js
// All shared logic for WorkPlan app

// Data storage
const companyData = {
    // Demo admin account
    'DEMO123': {
        name: 'Demo Bedrijf',
        email: 'admin@demo.nl',
        password: 'demo123',
        adminEmail: 'admin@demo.nl',
        employees: [
            {
                id: 'emp1',
                name: 'Jan Werknemer',
                email: 'jan@demo.nl',
                referralCode: 'WORK001',
                tempPassword: 'werk123',
                vacations: []
            },
            {
                id: 'emp2',
                name: 'Marie Medewerker',
                email: 'marie@demo.nl',
                referralCode: 'WORK002',
                tempPassword: 'werk123',
                vacations: []
            }
        ],
        projects: [
            { id: 'proj1', name: 'Website Redesign', favoriteEmployees: [] },
            { id: 'proj2', name: 'App Development', favoriteEmployees: [] }
        ],
        settings: { maxHours: 40, minRest: 12 }
    }
};
let currentUser = null;
let loginType = 'company';
let menuOpen = false;

// Show demo credentials hint
console.log('=== DEMO ACCOUNTS ===');
console.log('Admin: Code=DEMO123, Wachtwoord=demo123');
console.log('Werknemer: Code=WORK001, Wachtwoord=werk123');
console.log('=====================');

// Navigation
function toggleMenu() {
    menuOpen = !menuOpen;
    const nav = document.getElementById('main-nav');
    nav.classList.toggle('open', menuOpen);
}

function closeMenu() {
    menuOpen = false;
    document.getElementById('main-nav').classList.remove('open');
}

function showSection(sectionId) {
    document.querySelectorAll('.section').forEach(section => {
        section.classList.add('hidden');
    });
    document.getElementById(sectionId).classList.remove('hidden');
    closeMenu();

    if (sectionId === 'employees') updateEmployeesList();
    if (sectionId === 'projects') updateProjectsList();
    if (sectionId === 'vacation') updateVacationList();
}

// Login functions
function selectLoginType(type, btn) {
    loginType = type;
    document.querySelectorAll('.login-type-btn').forEach(b => {
        b.classList.remove('active');
    });
    if (btn) btn.classList.add('active');

    const label = document.getElementById('login-username-label');
    const input = document.getElementById('login-username');

    if (type === 'company') {
        label.textContent = 'Bedrijfscode';
        input.placeholder = 'Bv. DEMO123';
    } else {
        label.textContent = 'Werknemerscode';
        input.placeholder = 'Jouw unieke code';
    }
}

function showRegister() {
    document.getElementById('login-form').classList.add('hidden');
    document.getElementById('register-form').classList.remove('hidden');
    document.getElementById('login-extra-links').classList.add('hidden');
    document.getElementById('login-error').classList.add('hidden');
}

function showLogin() {
    document.getElementById('login-form').classList.remove('hidden');
    document.getElementById('register-form').classList.add('hidden');
    document.getElementById('login-extra-links').classList.remove('hidden');
    document.getElementById('register-error').classList.add('hidden');
}

function showError(id, message) {
    const errorEl = document.getElementById(id);
    errorEl.textContent = message;
    errorEl.classList.remove('hidden');
    setTimeout(() => errorEl.classList.add('hidden'), 5000);
}

function registerCompany() {
    const name = document.getElementById('register-name').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;

    if (!name || !email || !password) {
        showError('register-error', 'Vul alle velden in');
        return;
    }

    if (password.length < 6) {
        showError('register-error', 'Wachtwoord moet minimaal 6 karakters zijn');
        return;
    }

    const companyCode = name.substring(0, 3).toUpperCase() + Math.random().toString(36).substring(2, 6).toUpperCase();

    companyData[companyCode] = {
        name,
        email,
        password,
        employees: [],
        projects: [],
        settings: { maxHours: 40, minRest: 12 },
        adminEmail: email
    };

    alert(`✅ Bedrijf geregistreerd!\n\nJe bedrijfscode: ${companyCode}\n\nBewaar deze code, je hebt hem nodig om in te loggen.`);
    showLogin();
    document.getElementById('register-name').value = '';
    document.getElementById('register-email').value = '';
    document.getElementById('register-password').value = '';
}

function login() {
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;

    if (!username || !password) {
        showError('login-error', 'Vul alle velden in');
        return;
    }

    // Use local login (API not available in production)
    localLogin(username, password);
}

function localLogin(username, password) {
    if (loginType === 'company') {
        const company = companyData[username.toUpperCase()];
        if (company && company.password === password) {
            currentUser = {
                type: 'company',
                code: username.toUpperCase(),
                email: company.adminEmail
            };
            // Save to localStorage for new pages
            localStorage.setItem('userData', JSON.stringify({
                type: 'company',
                code: username.toUpperCase(),
                name: company.name || username.toUpperCase(),
                email: company.adminEmail
            }));
            localStorage.setItem('token', 'local-' + Date.now());
            showApp();
        } else {
            showError('login-error', 'Ongeldige bedrijfscode of wachtwoord');
        }
    } else {
        let found = false;
        for (const companyCode in companyData) {
            const employee = companyData[companyCode].employees.find(emp =>
                emp.referralCode === username && emp.tempPassword === password
            );
            if (employee) {
                currentUser = {
                    type: 'employee',
                    code: companyCode,
                    employeeId: employee.id,
                    name: employee.name
                };
                // Save to localStorage for new pages
                localStorage.setItem('userData', JSON.stringify({
                    type: 'employee',
                    id: employee.id,
                    name: employee.name,
                    email: employee.email,
                    companyCode: companyCode
                }));
                localStorage.setItem('token', 'local-' + Date.now());
                found = true;
                showApp();
                break;
            }
        }
        if (!found) {
            showError('login-error', 'Ongeldige werknemerscode of wachtwoord');
        }
    }
}

function showApp() {
    document.getElementById('login-page').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');

    const nav = document.getElementById('main-nav');
    const userInfo = document.getElementById('user-info');

    if (currentUser.type === 'company') {
        document.getElementById('admin-sections').classList.remove('hidden');
        document.getElementById('employee-sections').classList.add('hidden');
        userInfo.textContent = `Bedrijf: ${currentUser.code}`;

        nav.innerHTML = `
            <button onclick="showSection('dashboard')">📊 Dashboard</button>
            <button onclick="showSection('employees')">👥 Werknemers</button>
            <button onclick="showSection('projects')">📋 Projecten</button>
            <button onclick="showSection('settings')">⚙️ Instellingen</button>
            <button onclick="logout()" style="background: #e74c3c; margin-top: 20px;">🚪 Uitloggen</button>
        `;
    } else {
        document.getElementById('admin-sections').classList.add('hidden');
        document.getElementById('employee-sections').classList.remove('hidden');
        document.getElementById('dashboard').classList.remove('hidden');
        userInfo.textContent = `Werknemer: ${currentUser.name}`;

        nav.innerHTML = `
            <button onclick="showSection('dashboard')">📊 Dashboard</button>
            <button onclick="showSection('vacation')">🏖️ Vakantie</button>
            <button onclick="logout()" style="background: #e74c3c; margin-top: 20px;">🚪 Uitloggen</button>
        `;
    }

    loadCompanyData();
    showSection('dashboard');
}

function logout() {
    currentUser = null;
    document.getElementById('app').classList.add('hidden');
    document.getElementById('login-page').classList.remove('hidden');
    document.getElementById('login-password').value = '';
    closeMenu();
}

function getCurrentCompany() {
    return companyData[currentUser.code];
}

function loadCompanyData() {
    if (!currentUser) return;

    const company = getCurrentCompany();
    if (!company) return;

    if (currentUser.type === 'company') {
        window.employees = company.employees;
        window.projects = company.projects;
        window.settings = company.settings;
    } else {
        window.employees = company.employees;
        window.projects = company.projects;
        window.vacations = company.employees.find(e => e.id === currentUser.employeeId)?.vacations || [];
    }
}

function saveCompanyData() {
    if (!currentUser) return;

    const company = getCurrentCompany();
    if (company) {
        company.employees = window.employees || [];
        company.projects = window.projects || [];
        company.settings = window.settings || { maxHours: 40, minRest: 12 };
    }

    localStorage.setItem('companyData', JSON.stringify(companyData));
}

setInterval(saveCompanyData, 5000);

// Employee management
function addEmployee() {
    const name = document.getElementById('employee-name').value;
    const email = document.getElementById('employee-email').value;

    if (!name || !email) {
        alert('⚠️ Vul alle velden in');
        return;
    }

    const employee = {
        id: Date.now(),
        name,
        email,
        referralCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
        tempPassword: Math.random().toString(36).substring(2, 10),
        vacations: []
    };

    window.employees.push(employee);
    document.getElementById('employee-name').value = '';
    document.getElementById('employee-email').value = '';
    updateEmployeesList();
    saveCompanyData();

    setTimeout(() => {
        alert(`✅ Werknemer toegevoegd!\n\nInloggegevens voor ${name}:\nCode: ${employee.referralCode}\nWachtwoord: ${employee.tempPassword}\n\nDeel deze gegevens veilig met je werknemer.`);
    }, 100);
}

function updateEmployeesList() {
    const list = document.getElementById('employees-list');
    list.innerHTML = window.employees.map(emp => `
        <div class="employee-row">
            <div class="employee-info">
                <div>
                    <div class="employee-name">${emp.name}</div>
                    <div class="employee-meta">${emp.email}</div>
                    <div class="employee-meta">Code: ${emp.referralCode}</div>
                </div>
            </div>
            <div class="employee-actions">
                <button class="secondary" style="margin: 0;" onclick="removeEmployee(${emp.id})">Verwijder</button>
                <button class="secondary" style="margin: 0;" onclick="shareLogin('${emp.referralCode}', '${emp.tempPassword}')">Deel Login</button>
            </div>
        </div>
    `).join('');
}

function removeEmployee(id) {
    if (confirm('⚠️ Weet je zeker dat je deze werknemer wilt verwijderen?')) {
        window.employees = window.employees.filter(emp => emp.id !== id);
        updateEmployeesList();
        saveCompanyData();
    }
}

function shareLogin(code, password) {
    if (navigator.share) {
        navigator.share({
            title: 'WorkPlan Inloggegevens',
            text: `Je WorkPlan inloggegevens:\nCode: ${code}\nWachtwoord: ${password}`
        });
    } else {
        navigator.clipboard.writeText(`Code: ${code}\nWachtwoord: ${password}`);
        alert('📋 Inloggegevens gekopieerd naar klembord!');
    }
}

function handleCSVUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const lines = e.target.result.split('\n');
        let added = 0;

        lines.forEach(line => {
            const [name, email] = line.split(',');
            if (name && email && name.trim() && email.trim()) {
                window.employees.push({
                    id: Date.now() + Math.random(),
                    name: name.trim(),
                    email: email.trim(),
                    referralCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
                    tempPassword: Math.random().toString(36).substring(2, 10),
                    vacations: []
                });
                added++;
            }
        });

        saveCompanyData();
        updateEmployeesList();
        alert(`✅ CSV geïmporteerd! ${added} werknemers toegevoegd.`);
    };
    reader.readAsText(file);
}

// Project management
function addProject() {
    const name = document.getElementById('project-name').value;
    if (!name) return;

    window.projects.push({
        id: Date.now(),
        name,
        favoriteEmployees: []
    });

    document.getElementById('project-name').value = '';
    updateProjectsList();
    saveCompanyData();
}

function updateProjectsList() {
    const list = document.getElementById('projects-list');
    list.innerHTML = window.projects.map(project => `
        <div class="project-card">
            <div class="project-name">${project.name}</div>
            <div style="margin-top: 15px;">
                <strong>Favoriete werknemers (% voorrang):</strong>
                ${window.employees.map(emp => {
                    const isFav = project.favoriteEmployees.find(f => f.id === emp.id);
                    return `
                        <div class="favorite-employee-item">
                            <label class="employee-checkbox-label">
                                <input type="checkbox"
                                    ${isFav ? 'checked' : ''}
                                    onchange="toggleFavorite(${project.id}, ${emp.id})">
                                <span style="margin-left: 8px;">${emp.name}</span>
                            </label>
                            <div class="priority-control">
                                <input type="range" class="priority-slider" min="0" max="100"
                                    value="${isFav?.priority || 50}"
                                    onchange="updatePriority(${project.id}, ${emp.id}, this.value)"
                                    ${!isFav ? 'disabled' : ''}>
                                <span class="priority-value">${isFav?.priority || 0}%</span>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `).join('');
}

function toggleFavorite(projectId, employeeId) {
    const project = window.projects.find(p => p.id === projectId);
    const existing = project.favoriteEmployees.find(f => f.id === employeeId);

    if (existing) {
        project.favoriteEmployees = project.favoriteEmployees.filter(f => f.id !== employeeId);
    } else {
        project.favoriteEmployees.push({ id: employeeId, priority: 50 });
    }

    updateProjectsList();
    saveCompanyData();
}

function updatePriority(projectId, employeeId, value) {
    const project = window.projects.find(p => p.id === projectId);
    const employee = project.favoriteEmployees.find(f => f.id === employeeId);
    if (employee) {
        employee.priority = parseInt(value);
        updateProjectsList();
        saveCompanyData();
    }
}

// Vacation management
function addVacation() {
    const start = document.getElementById('vacation-start').value;
    const end = document.getElementById('vacation-end').value;

    if (!start || !end) {
        alert('⚠️ Selecteer start en eind datum');
        return;
    }

    if (new Date(start) > new Date(end)) {
        alert('⚠️ Startdatum moet voor einddatum liggen');
        return;
    }

    if (currentUser.type === 'employee') {
        const employee = window.employees.find(e => e.id === currentUser.employeeId);
        if (!employee.vacations) employee.vacations = [];
        employee.vacations.push({ id: Date.now(), start, end });
        window.vacations = employee.vacations;
    } else {
        window.vacations.push({ id: Date.now(), start, end });
    }

    document.getElementById('vacation-start').value = '';
    document.getElementById('vacation-end').value = '';
    updateVacationList();
    saveCompanyData();
}

function updateVacationList() {
    const list = document.getElementById('vacation-list');
    const vacations = currentUser.type === 'employee'
        ? window.employees.find(e => e.id === currentUser.employeeId)?.vacations || []
        : window.vacations || [];

    list.innerHTML = vacations.map(vac => `
        <div class="vacation-item">
            <div>
                <strong>📅 ${formatDate(vac.start)}</strong> tot <strong>${formatDate(vac.end)}</strong>
            </div>
            <button class="secondary" style="width: auto; margin: 0;" onclick="removeVacation(${vac.id})">Verwijder</button>
        </div>
    `).join('');
}

function removeVacation(id) {
    if (confirm('⚠️ Deze vakantie verwijderen?')) {
        if (currentUser.type === 'employee') {
            const employee = window.employees.find(e => e.id === currentUser.employeeId);
            employee.vacations = employee.vacations.filter(vac => vac.id !== id);
            window.vacations = employee.vacations;
        } else {
            window.vacations = window.vacations.filter(vac => vac.id !== id);
        }
        updateVacationList();
        saveCompanyData();
    }
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' });
}

// Schedule generation
function generateSchedule() {
    if (!window.employees || window.employees.length === 0 || !window.projects || window.projects.length === 0) {
        alert('⚠️ Voeg eerst werknemers en projecten toe!');
        return;
    }

    const output = document.getElementById('schedule-output');
    let scheduleHTML = '<div class="success" style="margin-bottom: 20px;">✅ Planning gegenereerd!</div>';

    // Mobiele list view
    scheduleHTML += '<div class="schedule-list">';

    window.projects.forEach(project => {
        const availableEmployees = window.employees.filter(emp => {
            if (currentUser.type === 'employee' && emp.id !== currentUser.employeeId) return false;

            const isOnVacation = emp?.vacations?.some(vac => {
                const today = new Date().toISOString().split('T')[0];
                return today >= vac.start && today <= vac.end;
            });
            return !isOnVacation;
        });

        if (availableEmployees.length > 0) {
            const sortedEmployees = availableEmployees.sort((a, b) => {
                const aFav = project.favoriteEmployees.find(f => f.id === a.id);
                const bFav = project.favoriteEmployees.find(f => f.id === b.id);
                return (bFav?.priority || 0) - (aFav?.priority || 0);
            });

            sortedEmployees.slice(0, 3).forEach((emp, index) => {
                const fav = project.favoriteEmployees.find(f => f.id === emp.id);
                scheduleHTML += `
                    <div class="schedule-item">
                        <div class="schedule-project">${project.name}</div>
                        <div class="schedule-details">
                            <span class="schedule-label">Werknemer:</span>
                            <span class="schedule-value">${emp.name}</span>
                            <span class="schedule-label">Week:</span>
                            <span class="schedule-value">${index + 1}</span>
                            <span class="schedule-label">Prioriteit:</span>
                            <span class="schedule-value">${fav?.priority || 0}%</span>
                        </div>
                    </div>
                `;
            });
        }
    });

    scheduleHTML += '</div>';

    // Desktop tabel (verborgen op mobiel)
    scheduleHTML += '<table style="margin-top: 20px;"><tr><th>Project</th><th>Werknemer</th><th>Dag</th><th>%</th></tr>';

    window.projects.forEach(project => {
        const availableEmployees = window.employees.filter(emp => {
            const isOnVacation = emp?.vacations?.some(vac => {
                const today = new Date().toISOString().split('T')[0];
                return today >= vac.start && today <= vac.end;
            });
            return !isOnVacation;
        });

        if (availableEmployees.length > 0) {
            const sortedEmployees = availableEmployees.sort((a, b) => {
                const aFav = project.favoriteEmployees.find(f => f.id === a.id);
                const bFav = project.favoriteEmployees.find(f => f.id === b.id);
                return (bFav?.priority || 0) - (aFav?.priority || 0);
            });

            sortedEmployees.slice(0, 3).forEach((emp, index) => {
                const fav = project.favoriteEmployees.find(f => f.id === emp.id);
                scheduleHTML += `
                    <tr>
                        <td>${project.name}</td>
                        <td>${emp.name}</td>
                        <td>Week ${index + 1}</td>
                        <td>${fav?.priority || 0}%</td>
                    </tr>
                `;
            });
        }
    });

    scheduleHTML += '</table>';
    output.innerHTML = scheduleHTML;
}

function saveSettings() {
    window.settings = {
        maxHours: parseInt(document.getElementById('max-hours').value),
        minRest: parseInt(document.getElementById('min-rest').value)
    };
    saveCompanyData();
    alert('✅ Instellingen opgeslagen!');
}

// Initialize demo data
document.addEventListener('DOMContentLoaded', () => {
    // Load existing company data from localStorage
    const savedCompanyData = localStorage.getItem('companyData');
    if (savedCompanyData) {
        try {
            const parsed = JSON.parse(savedCompanyData);
            Object.assign(companyData, parsed);
        } catch (e) {
            console.log('Could not parse saved company data');
        }
    }

    if (!companyData['DEMO123']) {
        companyData['DEMO123'] = {
            name: 'Demo Bedrijf',
            email: 'demo@workplan.nl',
            password: 'demo123',
            employees: [
                {
                    id: 'emp1',
                    name: 'Jan Werknemer',
                    email: 'jan@demo.nl',
                    referralCode: 'WORK001',
                    tempPassword: 'werk123',
                    vacations: []
                },
                {
                    id: 'emp2',
                    name: 'Marie Medewerker',
                    email: 'marie@demo.nl',
                    referralCode: 'WORK002',
                    tempPassword: 'werk123',
                    vacations: []
                }
            ],
            projects: [
                { id: 'proj1', name: 'Website Redesign', favoriteEmployees: [] },
                { id: 'proj2', name: 'App Development', favoriteEmployees: [] }
            ],
            settings: { maxHours: 40, minRest: 12 },
            adminEmail: 'demo@workplan.nl'
        };
    }

    // Auto-focus op eerste input
    document.getElementById('login-username').focus();
});

// Close menu on outside click
document.addEventListener('click', (e) => {
    if (menuOpen && !e.target.closest('header')) {
        closeMenu();
    }
});
