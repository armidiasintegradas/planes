'use client';

import { useState } from 'react';

export default function InfluencyDashboard() {
  const [activeNav, setActiveNav] = useState('Donators');
  const [selectedMonth, setSelectedMonth] = useState('Jun');
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const barChartData = [
    { month: 'May', blue: 36, lime: 72, value: '$68,400' },
    { month: 'Jun', blue: 64, lime: 75, value: '$75,200', date: 'Jun 2023' },
    { month: 'Jul', blue: 38, lime: 50, value: '$52,100' },
    { month: 'Aug', blue: 60, lime: 70, value: '$71,800' },
    { month: 'Sep', blue: 70, lime: 82, value: '$84,500' },
  ];

  return (
    <div className="min-h-screen outer-viewport p-4 md:p-8 flex items-center justify-center font-sans antialiased">
      
      {/* Outer Rounded Application Frame */}
      <div className="dashboard-main-frame w-full max-w-[1280px] min-h-[780px] p-5 md:p-7 flex flex-col lg:flex-row gap-6 relative">
        
        {/* =========================================================================
            LEFT SIDEBAR
        ========================================================================= */}
        <aside className="w-full lg:w-60 flex flex-col justify-between shrink-0">
          <div>
            {/* Logo */}
            <div className="flex items-center gap-3 px-3 py-2 mb-8">
              <div className="w-8 h-8 rounded-full border-2 border-slate-900 flex items-center justify-center font-bold text-slate-900 text-sm">
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" />
                </svg>
              </div>
              <span className="brand-logo-text text-[15px] text-slate-900">INFLUENCY</span>
            </div>

            {/* Nav Items */}
            <nav className="space-y-1.5">
              {[
                { name: 'Home', icon: '⌂' },
                { name: 'Post', icon: '▤' },
                { name: 'Donators', icon: '◻', badge: 2 },
                { name: 'Page', icon: '▢' },
                { name: 'Messages', icon: '💬', badge: 6 },
                { name: 'Statistic', icon: '◫' },
              ].map((item) => {
                const isActive = activeNav === item.name;
                return (
                  <button
                    key={item.name}
                    onClick={() => setActiveNav(item.name)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-[14px] transition text-left ${
                      isActive ? 'nav-pill-active' : 'nav-pill-inactive'
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <span className="text-base text-slate-400 w-5 text-center">{item.icon}</span>
                      <span className="font-semibold text-[13.5px]">{item.name}</span>
                    </div>
                    {item.badge && (
                      <span className="w-5 h-5 rounded-full bg-[#5d87ff] text-white text-[11px] font-bold flex items-center justify-center">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Upgrade to Pro Card */}
          <div className="white-bento-card p-5 mt-8 border border-slate-100 relative">
            <div className="w-10 h-10 rounded-full bg-[#d4ff00] flex items-center justify-center text-slate-900 font-bold mb-3.5 shadow-2xs">
              <span className="text-base">👑</span>
            </div>
            <h4 className="font-bold text-slate-900 text-[14px] tracking-tight mb-1">Upgrade to Pro</h4>
            <p className="text-slate-400 text-[12px] font-medium leading-relaxed mb-4">Discover the benefits of an upgraded account</p>
            <button
              onClick={() => setShowUpgradeModal(true)}
              className="w-full py-2.5 bg-slate-950 hover:bg-slate-800 text-white text-[12px] font-semibold rounded-full transition shadow-xs"
            >
              Upgrade $10
            </button>
          </div>
        </aside>

        {/* =========================================================================
            RIGHT MAIN DASHBOARD AREA
        ========================================================================= */}
        <div className="flex-1 flex flex-col gap-6">
          
          {/* Header Row */}
          <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="display-title text-[28px] text-slate-900 leading-none">Donators</h1>
                <span className="bg-[#8eb3ff] text-slate-900 text-[12px] font-bold px-3 py-1 rounded-full tracking-tight">
                  2 New
                </span>
              </div>
              <p className="text-slate-400 text-[13px] font-medium mt-1">See all your donators information here</p>
            </div>

            {/* Right User & Utility Controls */}
            <div className="flex items-center gap-3">
              <button className="icon-circle-btn shadow-2xs" title="Search">
                <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>

              <button className="icon-circle-btn relative shadow-2xs" title="Notifications">
                <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white"></span>
              </button>

              <div className="flex items-center gap-2.5 bg-white border border-slate-200/80 rounded-full pl-1.5 pr-3 py-1 shadow-2xs cursor-pointer hover:border-slate-300 transition">
                <div className="w-7 h-7 rounded-full bg-slate-200 overflow-hidden shrink-0">
                  <img
                    src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"
                    alt="Andrew Johnson"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="text-left hidden sm:block">
                  <span className="text-[10.5px] text-slate-400 block leading-tight font-medium">Welcome back</span>
                  <strong className="text-[12.5px] text-slate-900 block font-bold leading-tight">Andrew Johnson</strong>
                </div>
                <span className="text-[10px] text-slate-400 ml-0.5">∨</span>
              </div>
            </div>
          </header>

          {/* =========================================================================
              TOP 4 KPI BENTO CARDS
          ========================================================================= */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            
            {/* Card 1: Lime Neon Gradient Card */}
            <div className="lime-bento-card p-5 flex flex-col justify-between min-h-[148px]">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-full bg-white/90 flex items-center justify-center text-slate-900 shadow-2xs">
                  <span className="text-sm">💵</span>
                </div>
                <button className="w-9 h-9 rounded-full border border-slate-900/15 hover:bg-black/5 flex items-center justify-center text-slate-900 font-bold transition">
                  ↗
                </button>
              </div>
              <div>
                <div className="stat-display-number text-[30px] text-slate-950 mb-1">
                  $740.89
                </div>
                <span className="text-slate-800 text-[12px] font-medium">In this month</span>
              </div>
            </div>

            {/* Card 2: Active Donation Goals */}
            <div className="white-bento-card p-5 flex flex-col justify-between min-h-[148px] border border-slate-100">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-700">
                  <span className="text-sm">👑</span>
                </div>
                <button className="w-9 h-9 rounded-full border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-700 font-bold transition">
                  ↗
                </button>
              </div>
              <div>
                <div className="flex items-baseline gap-1.5 mb-1">
                  <span className="stat-display-number text-[30px] text-slate-900">80%</span>
                  <span className="text-slate-400 text-[12.5px] font-medium">$800 of $1000</span>
                </div>
                <span className="text-slate-400 text-[12px] font-medium">Active Donation Goals</span>
              </div>
            </div>

            {/* Card 3: In this month +8 */}
            <div className="white-bento-card p-5 flex flex-col justify-between min-h-[148px] border border-slate-100">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-700">
                  <span className="text-sm">👥</span>
                </div>
                <button className="w-9 h-9 rounded-full border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-700 font-bold transition">
                  ↗
                </button>
              </div>
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="stat-display-number text-[30px] text-slate-900">38</span>
                  <span className="bg-[#8eb3ff] text-slate-900 text-[11px] font-bold px-2 py-0.5 rounded-full">+8</span>
                </div>
                <span className="text-slate-400 text-[12px] font-medium">In this month</span>
              </div>
            </div>

            {/* Card 4: For all time */}
            <div className="white-bento-card p-5 flex flex-col justify-between min-h-[148px] border border-slate-100">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-700">
                  <span className="text-sm">👛</span>
                </div>
                <button className="w-9 h-9 rounded-full border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-700 font-bold transition">
                  ↗
                </button>
              </div>
              <div>
                <div className="stat-display-number text-[30px] text-slate-900 mb-1">
                  $8,234.19
                </div>
                <span className="text-slate-400 text-[12px] font-medium">For all time</span>
              </div>
            </div>

          </div>

          {/* =========================================================================
              MIDDLE ROW: STATISTICS DUAL BAR CHART + VISITORS BUBBLE CARD
          ========================================================================= */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            
            {/* Left Card: Statistics (8 cols on lg) */}
            <div className="lg:col-span-7 xl:col-span-8 white-bento-card p-6 border border-slate-100 flex flex-col justify-between">
              <div>
                {/* Header Row */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-700 text-xs">
                      📊
                    </div>
                    <h3 className="text-[17px] font-bold text-slate-900 tracking-tight">Statistics</h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="bg-slate-100 p-0.5 rounded-full flex border border-slate-200/60">
                      <button className="px-3.5 py-1 text-xs font-semibold rounded-full bg-white text-slate-900 shadow-2xs">
                        Monthly
                      </button>
                    </div>
                    <button className="w-7 h-7 rounded-full border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50">
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Subheader: Income | Spend */}
                <div className="grid grid-cols-2 gap-4 pb-6 border-b border-slate-100 mb-6">
                  <div>
                    <span className="text-[12px] text-slate-400 block font-medium">Income</span>
                    <div className="stat-display-number text-[26px] text-slate-900 my-1">$150.09</div>
                    <span className="text-[11.5px] text-emerald-600 font-semibold flex items-center gap-1">
                      <span>↗ 4,1%</span>
                      <span className="text-slate-400 font-normal">vs 143,938 Last Year</span>
                    </span>
                  </div>

                  <div className="border-l border-slate-100 pl-4">
                    <span className="text-[12px] text-slate-400 block font-medium">Spend</span>
                    <div className="stat-display-number text-[26px] text-slate-900 my-1">$90.23</div>
                    <span className="text-[11.5px] text-emerald-600 font-semibold flex items-center gap-1">
                      <span>↗ 2%</span>
                      <span className="text-slate-400 font-normal">vs 82,203 Last Year</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Dual Bar Chart with Floating Tooltip */}
              <div className="h-56 relative flex flex-col justify-end pt-8">
                {/* Y-Axis Label Gridlines */}
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none text-[11px] text-slate-300 font-medium">
                  <div className="border-b border-slate-100/60 pb-1">$100</div>
                  <div className="border-b border-slate-100/60 pb-1">$75</div>
                  <div className="border-b border-slate-100/60 pb-1">$50</div>
                  <div className="border-b border-slate-100/60 pb-1">$25</div>
                  <div>$10</div>
                </div>

                {/* Bars Container */}
                <div className="relative z-10 flex justify-between items-end h-44 px-4 sm:px-8">
                  {barChartData.map((item) => (
                    <div
                      key={item.month}
                      onClick={() => setSelectedMonth(item.month)}
                      className="flex flex-col items-center gap-2 group cursor-pointer"
                    >
                      {/* Dual Bar Column */}
                      <div className="flex items-end gap-1.5 h-36 relative">
                        {/* Tooltip on Jun / Selected Month */}
                        {selectedMonth === item.month && (
                          <div className="absolute -top-12 left-1/2 -translate-x-1/2 z-20 whitespace-nowrap">
                            <div className="speech-bubble text-[12px] font-extrabold text-center">
                              <div>{item.value}</div>
                              <div className="text-[9.5px] text-slate-300 font-normal">{item.date || `${item.month} 2023`}</div>
                            </div>
                            <div className="w-2 h-2 rounded-full bg-slate-950 mx-auto -mt-1 ring-2 ring-white"></div>
                          </div>
                        )}

                        {/* Soft Blue Bar */}
                        <div
                          style={{ height: `${item.blue}%` }}
                          className="w-4 sm:w-5 bg-[#8eb3ff] rounded-t-full group-hover:brightness-95 transition-all"
                        ></div>

                        {/* Lime Green Bar */}
                        <div
                          style={{ height: `${item.lime}%` }}
                          className="w-4 sm:w-5 bg-[#d4ff00] rounded-t-full group-hover:brightness-95 transition-all"
                        ></div>
                      </div>

                      {/* X-Axis Month Label */}
                      <span className={`text-[12px] transition ${selectedMonth === item.month ? 'font-bold text-slate-900' : 'text-slate-400 font-medium'}`}>
                        {item.month}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Right Card: Visitors (4 cols on lg) */}
            <div className="lg:col-span-5 xl:col-span-4 white-bento-card p-6 border border-slate-100 flex flex-col justify-between">
              <div>
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-700 text-xs">
                      👤
                    </div>
                    <h3 className="text-[17px] font-bold text-slate-900 tracking-tight">Visitors</h3>
                  </div>

                  <button className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50">
                    <span>This Month</span>
                    <span className="text-[10px]">∨</span>
                  </button>
                </div>

                {/* Overlapping Bubble Diagram */}
                <div className="relative h-44 my-4 flex items-center justify-center">
                  
                  {/* Large Lime Neon Circle (Individual) */}
                  <div className="absolute left-6 top-2 w-32 h-32 rounded-full bg-[#d4ff00] flex flex-col items-center justify-center text-slate-950 shadow-sm z-10 hover:scale-105 transition-transform">
                    <span className="text-[27px] font-black tracking-[-0.04em] leading-none">2,3k</span>
                    <span className="text-[11.5px] font-semibold text-slate-800 mt-0.5">Individual</span>
                  </div>

                  {/* Medium Soft Blue Circle (Corporate) */}
                  <div className="absolute right-6 top-8 w-28 h-28 rounded-full bg-[#8eb3ff] flex flex-col items-center justify-center text-slate-950 shadow-sm z-0 hover:scale-105 transition-transform">
                    <span className="text-[23px] font-black tracking-[-0.035em] leading-none">1,2k</span>
                    <span className="text-[11.5px] font-semibold text-slate-800 mt-0.5">Corporate</span>
                  </div>

                  {/* Small Light Grey Circle (Foundation) */}
                  <div className="absolute left-24 bottom-1 w-20 h-20 rounded-full bg-[#f1efea] border border-slate-200/60 flex flex-col items-center justify-center text-slate-900 shadow-sm z-20 hover:scale-105 transition-transform">
                    <span className="text-[15px] font-extrabold tracking-[-0.02em] leading-none">982</span>
                    <span className="text-[10px] font-medium text-slate-600 mt-0.5">Foundation</span>
                  </div>

                </div>
              </div>

              {/* Target Progress Bars */}
              <div className="space-y-3.5 pt-4 border-t border-slate-100">
                <div>
                  <div className="flex justify-between text-[12.5px] mb-1.5">
                    <span className="text-[#4b5563] font-medium">Individual Target</span>
                    <span className="text-slate-900 font-bold">92%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-[#d4ff00] rounded-full" style={{ width: '92%' }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[12.5px] mb-1.5">
                    <span className="text-[#4b5563] font-medium">Corporate Target</span>
                    <span className="text-slate-900 font-bold">67%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-[#8eb3ff] rounded-full" style={{ width: '67%' }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[12.5px] mb-1.5">
                    <span className="text-[#4b5563] font-medium">Foundation Target</span>
                    <span className="text-slate-900 font-bold">54%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-[#e5e2dc] rounded-full" style={{ width: '54%' }}></div>
                  </div>
                </div>
              </div>

            </div>

          </div>

        </div>

      </div>

      {/* Upgrade Modal Simulation */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 text-center">
            <div className="w-12 h-12 rounded-full bg-[#d4ff00] flex items-center justify-center text-xl mx-auto mb-3">
              👑
            </div>
            <h3 className="text-lg font-bold text-slate-900">Upgrade to Influency Pro</h3>
            <p className="text-xs text-slate-500 my-2">Get unlimited real-time donator analytics, custom exports, and automated campaign tracking.</p>
            <div className="my-4 p-3 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-2xl font-black text-slate-900">$10</span>
              <span className="text-xs text-slate-500"> / month</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowUpgradeModal(false)}
                className="flex-1 py-2.5 rounded-full border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => { setShowUpgradeModal(false); alert('Upgrade successfully simulated!'); }}
                className="flex-1 py-2.5 rounded-full bg-slate-950 text-white text-xs font-semibold hover:bg-slate-800"
              >
                Confirm $10
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
