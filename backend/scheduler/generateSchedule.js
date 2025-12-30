
/**
 * generateSchedule.js
 * Unified, fair scheduling with:
 * - Vacation awareness
 * - Max hours per week
 * - Multiple shifts per day
 * - minRest enforcement
 * - Fairness penalty system
 * - Priority-based scoring
 */

function generateSchedule(employees, projects, settings = { maxHours: 40, minRest: 12 }) {
  const hoursPerAssignmentDefault = 8; // fallback if project shift not set
  const schedule = [];

  // Stats per employee for fairness & tracking
  const stats = {};
  employees.forEach(emp => {
    const id = emp._id || emp.id;
    stats[id] = {
      totalHours: 0,
      assignments: 0,
      lastAssignedWeek: null,
      weekHours: {}, // weekNumber -> hours
      assignedDays: {} // date -> [{ projectId, startHour, endHour }]
    };
  });

  // Helper: get ISO week number
  function getWeekNumber(dateStr) {
    const d = new Date(dateStr);
    d.setHours(0,0,0,0);
    d.setDate(d.getDate() + 4 - (d.getDay()||7));
    const yearStart = new Date(d.getFullYear(),0,1);
    return Math.ceil((((d - yearStart) / 86400000) + 1)/7);
  }

  // Hard constraints
  function passesHardConstraints(emp, date, startHour, endHour) {
    const id = emp._id || emp.id;
    const week = getWeekNumber(date);

    // Vacation
    if (emp.vacations?.some(v => date >= v.start && date <= v.end)) return false;

    // Max hours per week
    if ((stats[id].weekHours[week] || 0) + (endHour - startHour) > settings.maxHours) return false;

    // Already assigned to overlapping shifts or minRest violation
    const assigned = stats[id].assignedDays[date] || [];
    for (const shift of assigned) {
      // Overlap
      if (!(endHour <= shift.startHour || startHour >= shift.endHour)) return false;
      // minRest enforcement
      if ((startHour - shift.endHour) < settings.minRest && (startHour - shift.endHour) > 0) return false;
      if ((shift.startHour - endHour) < settings.minRest && (shift.startHour - endHour) > 0) return false;
    }

    return true;
  }

  // Fairness penalty
  function fairnessPenalty(stat, week) {
    let penalty = 0;
    penalty += stat.totalHours * 0.5;
    penalty += stat.assignments * 2;
    if (stat.lastAssignedWeek === week - 1) penalty += 10;
    return penalty;
  }

  // Score function
  function calculateScore(emp, project, week) {
    const id = emp._id || emp.id;
    const fav = project.favoriteEmployees?.find(f => {
      const fid = f.employeeId?._id || f.employeeId || f.id;
      return fid.toString() === id.toString();
    });
    const priority = fav ? fav.priority : 0;
    const penalty = fairnessPenalty(stats[id], week);
    return priority - penalty;
  }

  // Assign employee
  function assignEmployee(emp, project, week, date, startHour, endHour) {
    const id = emp._id || emp.id;
    schedule.push({ project, emp, week, date, startHour, endHour });
    stats[id].totalHours += (endHour - startHour);
    stats[id].assignments += 1;
    stats[id].lastAssignedWeek = week;
    stats[id].weekHours[week] = (stats[id].weekHours[week] || 0) + (endHour - startHour);
    stats[id].assignedDays[date] = stats[id].assignedDays[date] || [];
    stats[id].assignedDays[date].push({ projectId: project._id || project.id, startHour, endHour });
  }

  // Main scheduling loop: assume 4-week horizon from today
  const today = new Date();
  const weeks = [0,1,2,3].map(offset => {
    const d = new Date(today);
    d.setDate(today.getDate() + offset*7);
    return {
      weekNumber: getWeekNumber(d.toISOString().split('T')[0]),
      startDate: d.toISOString().split('T')[0]
    };
  });

  weeks.forEach(({ weekNumber, startDate }) => {
    projects.forEach(project => {
      // Expect project.assignments: [{ date, startHour, endHour }]
      (project.assignments || [{ date: startDate, startHour: 9, endHour: 17 }]).forEach(shift => {
        const date = shift.date;
        const startHour = shift.startHour ?? 9;
        const endHour = shift.endHour ?? (startHour + hoursPerAssignmentDefault);

        const candidates = employees
          .filter(emp => passesHardConstraints(emp, date, startHour, endHour))
          .map(emp => ({ emp, score: calculateScore(emp, project, weekNumber) }))
          .sort((a, b) => b.score - a.score);

        if (candidates.length > 0) {
          assignEmployee(candidates[0].emp, project, weekNumber, date, startHour, endHour);
        }
      });
    });
  });

  return schedule;
}

module.exports = generateSchedule;