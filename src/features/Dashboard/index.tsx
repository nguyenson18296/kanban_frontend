// Figma asset URLs
const imgSarahAvatar = 'https://www.figma.com/api/mcp/asset/a3359e5c-18bb-48f1-8202-9b0889c54a08';
const imgDavidAvatar = 'https://www.figma.com/api/mcp/asset/0cecb94a-da96-454f-873d-d21811ff90b0';
const imgStatTotalTasks = 'https://www.figma.com/api/mcp/asset/78f62b8e-4b90-460f-884a-c05671f1943e';
const imgTrendUp = 'https://www.figma.com/api/mcp/asset/7b0a58d5-3189-4390-8eda-8123bbbcdd5f';
const imgStatInProgress = 'https://www.figma.com/api/mcp/asset/1b025063-abcc-43f2-844b-2bc1b454ca96';
const imgStatCompleted = 'https://www.figma.com/api/mcp/asset/3de36e77-c872-4b90-9569-e1d9f465de20';
const imgStatOverdue = 'https://www.figma.com/api/mcp/asset/3f88899a-a8a6-46ba-81f6-102a2f0ca52d';
const imgTrendDown = 'https://www.figma.com/api/mcp/asset/14bc05df-608d-400b-b24d-304a9f96f9f1';
const imgMenuDots = 'https://www.figma.com/api/mcp/asset/4b1e1ad2-d344-4716-aa6b-670a8d3e5393';
const imgBurndownChart = 'https://www.figma.com/api/mcp/asset/2d555356-d984-4d3d-8912-cc966a139c9a';
const imgCheckbox = 'https://www.figma.com/api/mcp/asset/db9839ed-a8d4-48c6-9aba-811c0210aafa';
const imgChevronRight = 'https://www.figma.com/api/mcp/asset/34c9dd03-82ef-428e-8722-1c56ead86708';
const imgClockWarning = 'https://www.figma.com/api/mcp/asset/b858111e-4494-4c99-b30e-89d44ce1b977';

function StatCard({
  icon,
  label,
  value,
  change,
  positive,
}: {
  icon: string;
  label: string;
  value: string;
  change: string;
  positive: boolean;
}) {
  return (
    <div className="flex flex-1 flex-col rounded-xl border border-[#f1f5f9] bg-white p-5 shadow-[0_1px_3px_0_rgba(0,0,0,0.05),0_1px_2px_-1px_rgba(0,0,0,0.01)]">
      <div className="flex items-start justify-between">
        <img src={icon} alt="" className="h-10 w-10" />
        <span
          className={`flex items-center gap-1 rounded-full px-2 py-1 text-xs font-bold leading-4 ${
            positive ? 'bg-[#f0fdf4] text-[#078841]' : 'bg-[#fef2f2] text-[#e74008]'
          }`}
        >
          <img src={positive ? imgTrendUp : imgTrendDown} alt="" className="h-3 w-3" />
          {change}
        </span>
      </div>
      <p className="m-0 mt-4 text-sm font-medium leading-5 text-[#64748b]">{label}</p>
      <p className="m-0 mt-1 text-[30px] font-bold leading-9 text-[#0f172a]">{value}</p>
    </div>
  );
}

function TasksByStatusChart() {
  const bars = [
    { label: 'To Do', height: '60%', color: 'bg-[#3b82f6]' },
    { label: 'In Prog', height: '80%', color: 'bg-[#fbbf24]' },
    { label: 'Review', height: '45%', color: 'bg-[#5a5cf2]' },
    { label: 'Done', height: '95%', color: 'bg-[#078841]' },
  ];

  return (
    <div className="flex flex-1 flex-col rounded-xl border border-[#f1f5f9] bg-white p-6 shadow-[0_1px_3px_0_rgba(0,0,0,0.05),0_1px_2px_-1px_rgba(0,0,0,0.01)]">
      <div className="flex items-center justify-between">
        <h3 className="m-0 text-lg font-bold leading-7 text-[#0f172a]">Tasks by Status</h3>
        <button className="flex h-8 w-8 items-center justify-center rounded-full border-none bg-transparent">
          <img src={imgMenuDots} alt="Menu" className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-6 flex flex-1 items-end gap-6">
        {bars.map((bar) => (
          <div key={bar.label} className="flex flex-1 flex-col items-center gap-2">
            <div className="flex h-40 w-full items-end rounded-lg bg-[#f1f5f9]">
              <div
                className={`w-full rounded-t-md ${bar.color}`}
                style={{ height: bar.height }}
              />
            </div>
            <span className="text-xs font-medium leading-4 text-[#64748b]">{bar.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SprintBurndownChart() {
  return (
    <div className="flex flex-1 flex-col rounded-xl border border-[#f1f5f9] bg-white p-6 shadow-[0_1px_3px_0_rgba(0,0,0,0.05),0_1px_2px_-1px_rgba(0,0,0,0.01)]">
      <div className="flex items-center justify-between">
        <h3 className="m-0 text-lg font-bold leading-7 text-[#0f172a]">Sprint Burndown</h3>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-xs font-medium leading-4 text-[#64748b]">
            <span className="inline-block h-2 w-2 rounded-full bg-[#cbd5e1]" />
            Ideal
          </span>
          <span className="flex items-center gap-1.5 text-xs font-medium leading-4 text-[#64748b]">
            <span className="inline-block h-2 w-2 rounded-full bg-[#5a5cf2]" />
            Actual
          </span>
        </div>
      </div>

      <div className="relative mt-4 flex-1">
        <img src={imgBurndownChart} alt="Sprint burndown chart" className="h-auto w-full" />
      </div>

      <div className="mt-4 flex justify-between">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map((day) => (
          <span key={day} className="text-xs font-medium leading-4 text-[#64748b]">
            {day}
          </span>
        ))}
      </div>
    </div>
  );
}

function RecentActivity() {
  const activities = [
    {
      avatar: imgSarahAvatar,
      avatarType: 'image' as const,
      name: 'Sarah',
      action: 'commented on',
      target: 'Marketing Dashboard',
      time: '2 mins ago',
      online: true,
    },
    {
      initials: 'MK',
      avatarType: 'initials' as const,
      initialsBg: 'bg-[#dbeafe]',
      initialsColor: 'text-[#2563eb]',
      name: 'Mike',
      action: 'moved ticket #402 to QA',
      time: '15 mins ago',
    },
    {
      avatar: imgDavidAvatar,
      avatarType: 'image' as const,
      name: 'David',
      action: 'uploaded 3 files to',
      target: 'Q3 Report',
      time: '1 hour ago',
    },
    {
      initials: 'AL',
      avatarType: 'initials' as const,
      initialsBg: 'bg-[#f3e8ff]',
      initialsColor: 'text-[#9333ea]',
      name: 'Alice',
      action: 'created a new project',
      time: '',
    },
  ];

  return (
    <div className="flex flex-1 flex-col rounded-xl border border-[#f1f5f9] bg-white p-6 shadow-[0_1px_3px_0_rgba(0,0,0,0.05),0_1px_2px_-1px_rgba(0,0,0,0.01)]">
      <div className="flex items-center justify-between">
        <h3 className="m-0 text-lg font-bold leading-7 text-[#0f172a]">Recent Activity</h3>
        <a href="#" className="text-xs font-semibold leading-4 text-[#5a5cf2] no-underline">
          View All
        </a>
      </div>

      <div className="mt-5 flex flex-col gap-5">
        {activities.map((item) => (
          <div key={item.name} className="flex items-start gap-3">
            {/* Avatar */}
            <div className="relative shrink-0">
              {item.avatarType === 'image' ? (
                <img
                  src={item.avatar}
                  alt={item.name}
                  className="h-9 w-9 rounded-full object-cover"
                />
              ) : (
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold leading-4 ${item.initialsBg} ${item.initialsColor}`}
                >
                  {item.initials}
                </div>
              )}
              {item.online && (
                <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-[#078841]" />
              )}
            </div>

            {/* Content */}
            <div className="min-w-0 flex-1">
              <p className="m-0 text-sm leading-5">
                <span className="font-semibold text-[#1e293b]">{item.name}</span>{' '}
                <span className="text-[#1e293b]">{item.action}</span>
                {item.target && (
                  <>
                    {' '}
                    <a href="#" className="font-semibold text-[#5a5cf2] no-underline">
                      {item.target}
                    </a>
                  </>
                )}
              </p>
              {item.time && (
                <p className="m-0 mt-0.5 text-xs leading-4 text-[#64748b]">{item.time}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MyTasksList() {
  const tasks = [
    {
      title: 'Review Q3 Financial Report',
      subtitle: 'Finance Project • Due Today',
      priority: 'HIGH',
      priorityClass: 'bg-[#fef2f2] text-[#e74008]',
    },
    {
      title: 'Update Figma Component Library',
      subtitle: 'Design System • Due Oct 26',
      priority: 'MEDIUM',
      priorityClass: 'bg-[#fffbeb] text-[#d97706]',
    },
    {
      title: 'Client Sync: onboarding',
      subtitle: 'Customer Success • Due Oct 27',
      priority: 'NORMAL',
      priorityClass: 'bg-[#eff6ff] text-[#2563eb]',
    },
  ];

  return (
    <div className="flex w-[632px] flex-col rounded-xl border border-[#f1f5f9] bg-white shadow-[0_1px_3px_0_rgba(0,0,0,0.05),0_1px_2px_-1px_rgba(0,0,0,0.01)]">
      {/* Header */}
      <div className="flex items-center justify-between px-6 pb-4 pt-6">
        <div className="flex items-center gap-3">
          <h3 className="m-0 text-lg font-bold leading-7 text-[#0f172a]">My Tasks</h3>
          <span className="rounded-full bg-[rgba(90,92,242,0.1)] px-2.5 py-0.5 text-xs font-bold leading-4 text-[#5a5cf2]">
            5 Remaining
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button className="rounded-xl border-none bg-transparent px-3 py-1.5 text-xs font-medium leading-4 text-[#64748b]">
            All
          </button>
          <button className="rounded-xl border-none bg-[rgba(90,92,242,0.1)] px-3 py-1.5 text-xs font-medium leading-4 text-[#5a5cf2]">
            Active
          </button>
          <button className="rounded-xl border-none bg-transparent px-3 py-1.5 text-xs font-medium leading-4 text-[#64748b]">
            Completed
          </button>
        </div>
      </div>

      {/* Task list */}
      <div className="flex flex-col gap-2 px-2">
        {tasks.map((task) => (
          <div
            key={task.title}
            className="flex items-center gap-4 rounded-xl border border-[#f1f5f9] p-3"
          >
            {/* Checkbox */}
            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-lg border border-[#cbd5e1]">
              <img src={imgCheckbox} alt="" className="h-2.5 w-2.5 opacity-0" />
            </div>

            {/* Task info */}
            <div className="min-w-0 flex-1">
              <p className="m-0 text-sm font-medium leading-5 text-[#0f172a]">{task.title}</p>
              <p className="m-0 text-xs leading-4 text-[#64748b]">{task.subtitle}</p>
            </div>

            {/* Priority badge */}
            <span
              className={`rounded-lg px-2 py-1 text-[10px] font-bold uppercase leading-[15px] tracking-[0.5px] ${task.priorityClass}`}
            >
              {task.priority}
            </span>

            {/* Action button */}
            <button className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-none bg-[#f1f5f9]">
              <img src={imgChevronRight} alt="View" className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="px-6 py-3 text-center">
        <a href="#" className="text-sm font-medium leading-5 text-[#5a5cf2] no-underline">
          View All Tasks
        </a>
      </div>
    </div>
  );
}

function UpcomingDeadlines() {
  const deadlines = [
    {
      month: 'OCT',
      day: '25',
      title: 'Website Launch',
      subtitle: 'Tomorrow',
      urgent: true,
    },
    {
      month: 'OCT',
      day: '28',
      title: 'Budget Approval',
      subtitle: '4 days left',
      urgent: false,
    },
    {
      month: 'NOV',
      day: '02',
      title: 'Q4 Strategy Kickoff',
      subtitle: 'Next Week',
      urgent: false,
    },
  ];

  return (
    <div className="flex w-[304px] flex-col rounded-xl border border-[#f1f5f9] bg-white p-6 shadow-[0_1px_3px_0_rgba(0,0,0,0.05),0_1px_2px_-1px_rgba(0,0,0,0.01)]">
      <h3 className="m-0 text-lg font-bold leading-7 text-[#0f172a]">Upcoming Deadlines</h3>

      <div className="mt-5 flex flex-col gap-2">
        {deadlines.map((item) => (
          <div
            key={item.day + item.month}
            className={`flex items-center gap-4 rounded-xl p-3.5 ${
              item.urgent
                ? 'border border-[#fee2e2] bg-[rgba(254,242,242,0.5)]'
                : 'border border-transparent bg-[rgba(248,250,252,0.5)]'
            }`}
          >
            {/* Date box */}
            <div
              className={`flex min-w-[50px] flex-col items-center rounded-lg px-3.5 py-1.5 shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] ${
                item.urgent
                  ? 'border border-[#fee2e2] bg-[#fef2f2]'
                  : 'border border-[#e2e8f0] bg-white'
              }`}
            >
              <span
                className={`text-[10px] font-bold uppercase leading-[15px] ${
                  item.urgent ? 'text-[#e74008]' : 'text-[#64748b]'
                }`}
              >
                {item.month}
              </span>
              <span className="text-lg font-bold leading-7 text-[#0f172a]">{item.day}</span>
            </div>

            {/* Content */}
            <div>
              <p className="m-0 text-sm font-bold leading-5 text-[#0f172a]">{item.title}</p>
              {item.urgent ? (
                <p className="m-0 mt-1 flex items-center gap-1 text-xs leading-4 text-[#e74008]">
                  <img src={imgClockWarning} alt="" className="h-3 w-3" />
                  {item.subtitle}
                </p>
              ) : (
                <p className="m-0 mt-1 text-xs leading-4 text-[#64748b]">{item.subtitle}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Main Dashboard Component ---

export default function Dashboard() {
  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-6">
      {/* Stat cards */}
      <div className="flex gap-6">
        <StatCard
          icon={imgStatTotalTasks}
          label="Total Tasks"
          value="148"
          change="+12%"
          positive
        />
        <StatCard
          icon={imgStatInProgress}
          label="In Progress"
          value="34"
          change="+5%"
          positive
        />
        <StatCard
          icon={imgStatCompleted}
          label="Completed"
          value="97"
          change="+8%"
          positive
        />
        <StatCard
          icon={imgStatOverdue}
          label="Overdue"
          value="17"
          change="-2%"
          positive={false}
        />
      </div>

      {/* Charts & Activity row */}
      <div className="flex gap-6">
        <TasksByStatusChart />
        <SprintBurndownChart />
        <RecentActivity />
      </div>

      {/* Bottom row: My Tasks & Deadlines */}
      <div className="flex gap-6">
        <MyTasksList />
        <UpcomingDeadlines />
      </div>
    </div>
  );
}
