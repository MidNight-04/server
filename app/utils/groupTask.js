const {
  getMonthRange,
  getTodayRange,
  getWeekRange,
  getYearRange,
  getYesterdayRange,
} = require('./dateUtils');

exports.groupTasksByDate = (tasks, siteIds = [], filters) => {
  let days;
  switch (filters.activeFilter) {
    case 'This Month':
      days = getMonthRange(0, true);
      break;
    case 'Last Month':
      days = getMonthRange(-1, true);
      break;
    case 'Today':
      days = getTodayRange(0, true);
      break;
    case 'Yesterday':
      days = getYesterdayRange(0, true);
      break;
    case 'This Week':
      days = getWeekRange(0, true);
      break;
    case 'Last Week':
      days = getWeekRange(-1, true);
      break;
    case 'This Year':
      days = getYearRange(0, true);
      break;
    default:
      days = getTodayRange(0, true);
  }
  if (!Array.isArray(days)) days = [];

  const commentMap = new Map(); // Map('siteID|YYYY-MM-DD' => [comments])
  const tasksBySite = new Map(); // Map(siteID => [tasks])

  for (const task of tasks) {
    // Base task info
    const baseData = {
      taskId: task._id,
      employee: {
        name: `${task.issueMember?.firstname || 'NA'} ${
          task.issueMember?.lastname || ''
        }`.trim(),
        id: task.issueMember?._id || null,
      },
      siteID: task.siteID,
      branch: task.branch,
      stepName: task.stepName,
      description: task.description,
      dueDate: task.dueDate,
    };

    // Store task by site
    if (!tasksBySite.has(task.siteID)) tasksBySite.set(task.siteID, []);
    tasksBySite.get(task.siteID).push(task);

    // Process comments
    if (task.comments?.length) {
      for (const c of task.comments.filter(c => c.type === 'In Progress')) {
        const dateKey = new Date(c.createdAt).toISOString().split('T')[0];
        const mapKey = `${task.siteID}|${dateKey}`;
        if (!commentMap.has(mapKey)) commentMap.set(mapKey, []);
        commentMap.get(mapKey).push({
          ...baseData,
          createdAt: new Date(c.createdAt),
          createdDateKey: dateKey,
          siteDetails: c.siteDetails || {},
        });
      }
    } else {
      const dateKey = new Date(task.createdAt || Date.now())
        .toISOString()
        .split('T')[0];
      const mapKey = `${task.siteID}|${dateKey}`;
      if (!commentMap.has(mapKey)) commentMap.set(mapKey, []);
      commentMap.get(mapKey).push({
        ...baseData,
        createdAt: new Date(task.createdAt || Date.now()),
        createdDateKey: dateKey,
        siteDetails: {
          isWorking: 'NA',
          materialAvailable: 'NA',
          workers: 'NA',
        },
      });
    }
  }

  const grouped = [];

  for (const day of days) {
    const dateKey = new Date(day).toISOString().split('T')[0];

    for (const site of siteIds) {
      const mapKey = `${site.siteID}|${dateKey}`;
      const existing = commentMap.get(mapKey);

      if (existing?.length) {
        grouped.push(...existing);
      } else {
        // No comments: push placeholder if task exists for this site
        const taskForSite = tasksBySite.get(site.siteID)?.[0];
        if (taskForSite) {
          grouped.push({
            taskId: taskForSite._id,
            employee: {
              name: `${taskForSite.issueMember?.firstname || 'NA'} ${
                taskForSite.issueMember?.lastname || ''
              }`.trim(),
              id: taskForSite.issueMember?._id || null,
            },
            siteID: site.siteID,
            branch: site.branch,
            stepName: taskForSite.stepName,
            description: taskForSite.description,
            createdAt: new Date(day),
            createdDateKey: dateKey,
            dueDate: taskForSite.dueDate,
            siteDetails: {
              isWorking: 'NA',
              materialAvailable: 'NA',
              workers: 'NA',
            },
          });
        }
      }
    }
  }

  return grouped;
};
