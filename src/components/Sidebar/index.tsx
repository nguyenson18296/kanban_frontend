const imgProfilePictureOfAlex = 'https://www.figma.com/api/mcp/asset/a4977786-8c3d-4a44-b39e-a637e6bf9c2f';
const imgBrandLogo = 'https://www.figma.com/api/mcp/asset/acf68363-8ae7-4d86-90f0-1a5ca540a07f';
const imgNavDashboard = 'https://www.figma.com/api/mcp/asset/d041188c-18bd-492d-babf-c8edd61ec034';
const imgNavProjects = 'https://www.figma.com/api/mcp/asset/26b087f1-7c23-4354-805d-4294ece1107a';
const imgNavMyTasks = 'https://www.figma.com/api/mcp/asset/fa16ab0b-d6ee-4713-8ce0-a3f505df1f5a';
const imgNavTeam = 'https://www.figma.com/api/mcp/asset/7cada261-1764-48db-9b5d-94f288735554';
const imgNavCalendar = 'https://www.figma.com/api/mcp/asset/a613a028-c85e-4377-9b76-5f049cfb7f70';
const imgNavReports = 'https://www.figma.com/api/mcp/asset/9a80808b-6034-4b82-9327-ac4b22d3c52d';
const imgNavSettings = 'https://www.figma.com/api/mcp/asset/04ae9a7f-4da2-4319-9397-7032ae063714';

export default function Sidebar() {
  const navItems = [
    { icon: imgNavDashboard, label: 'Dashboard', active: true },
    { icon: imgNavProjects, label: 'Projects' },
    { icon: imgNavMyTasks, label: 'My Tasks' },
    { icon: imgNavTeam, label: 'Team' },
    { icon: imgNavCalendar, label: 'Calendar' },
    { icon: imgNavReports, label: 'Reports' },
  ];

  return (
    <aside className="flex w-[256px] shrink-0 flex-col justify-between border-r border-[#1e293b] bg-[#0f172a] p-6">
      {/* Top */}
      <div>
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#5a5cf2] shadow-[0_10px_15px_-3px_rgba(90,92,242,0.3),0_4px_6px_-4px_rgba(90,92,242,0.3)]">
            <img src={imgBrandLogo} alt="" className="h-5 w-5" />
          </div>
          <div>
            <div className="text-lg font-bold leading-7 text-white">Flowboard</div>
            <div className="text-xs font-medium leading-4 text-[#94a3b8]">Pro Workspace</div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="mt-6 flex flex-col gap-2">
          {navItems.map((item) => (
            <a
              key={item.label}
              href="#"
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium leading-5 no-underline transition-colors ${
                item.active
                  ? 'bg-[#5a5cf2] text-white'
                  : 'text-[#cbd5e1] hover:bg-white/5 hover:text-white'
              }`}
            >
              <img src={item.icon} alt="" className="h-[18px] w-[18px]" />
              {item.label}
            </a>
          ))}
        </nav>
      </div>

      {/* Bottom */}
      <div className="flex flex-col gap-4">
        <a
          href="#"
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium leading-5 text-[#cbd5e1] no-underline transition-colors hover:bg-white/5 hover:text-white"
        >
          <img src={imgNavSettings} alt="" className="h-[18px] w-[18px]" />
          Settings
        </a>

        <div className="border-t border-[#334155] pt-4">
          <div className="flex items-center gap-3">
            <img
              src={imgProfilePictureOfAlex}
              alt="Alex Morgan"
              className="h-10 w-10 rounded-full border-2 border-[#475569] object-cover"
            />
            <div>
              <div className="text-sm font-medium leading-5 text-white">Alex Morgan</div>
              <div className="text-xs font-medium leading-4 text-[#94a3b8]">Project Manager</div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
