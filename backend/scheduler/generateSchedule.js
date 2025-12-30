function getISOWeek(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

function isOnVacation(emp, date) {
  return emp.vacations?.some(v => {
    const start = new Date(v.start);
    const end = new Date(v.end);
    return date >= start && date <= end;
  });
}

function fairnessPenalty(stat, week) {
  let penalty = 0;
  penalty += stat.totalHours * 0.5;
  penalty += stat.assignments * 2;
  if (stat.lastWeek === week - 1) penalty += 10;
  return penalty;
}

function generateSchedule(employees, projects, settings = {}) {
  const maxHours = settings.maxHours || 40;
  const hoursPerAssignment = settings.hoursPerAssignment || 8;

  const today = new Date();
  const weeks = [0, 1, 2, 3].map(i => {
    const d = new Date(today);
    d.setDate(today.getDate() + i * 7);
    return { date: d, week: getISOWeek(d) };
  });

  const stats = {};
  employees.forEach(emp => {
    stats[emp._id || emp.id] = {
      totalHours: 0,
      assignments: 0,
      weekHours: {},
      lastWeek: null
    };
  });

  const schedule = [];

  weeks.forEach(({ date, week }) => {
    projects.forEach(project => {
      const candidates = employees
        .filter(emp => !isOnVacation(emp, date))
        .filter(emp => {
          const s = stats[emp._id || emp.id];
          return (s.weekHours[week] || 0) + hoursPerAssignment <= maxHours;
        })
        .map(emp => {
          const fav = project.favoriteEmployees?.find(f =>
            (f.employeeId?._id || f.employeeId || f.id).toString() ===
            (emp._id || emp.id).toString()
          );
          const priority = fav ? fav.priority : 0;
          const penalty = fairnessPenalty(stats[emp._id || emp.id], week);

          return {
            emp,
            priority,
            score: priority - penalty
          };
        })
        .sort((a, b) => b.score - a.score);

      const chosen = candidates[0];
      if (!chosen) return;

      const id = chosen.emp._id || chosen.emp.id;
      const stat = stats[id];

      stat.totalHours += hoursPerAssignment;
      stat.assignments += 1;
      stat.lastWeek = week;
      stat.weekHours[week] = (stat.weekHours[week] || 0) + hoursPerAssignment;

      schedule.push({
        project: { id: project._id || project.id, name: project.name },
        employee: { id, name: chosen.emp.name, email: chosen.emp.email },
        week,
        date: date.toISOString().split('T')[0],
        priority: chosen.priority
      });
    });
  });

  return schedule;
}

module.exports = generateSchedule;