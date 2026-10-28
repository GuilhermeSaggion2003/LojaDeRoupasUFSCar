import { Outlet } from 'react-router-dom'
import { AppSidebar } from './app-shell/app-sidebar'
import { MobileBottomNav, MobileHeader } from './app-shell/mobile-nav'

export default function DashboardLayout() {
  return (
    <div className="min-h-dvh bg-background">
      <AppSidebar />
      <MobileHeader />
      <main className="pb-24 md:pb-0 md:pl-64">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-8">
          <Outlet />
        </div>
      </main>
      <MobileBottomNav />
    </div>
  )
}