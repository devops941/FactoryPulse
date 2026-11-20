import { createBrowserRouter } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import ProtectedRoute from '@/components/auth/ProtectedRoute'

// Lazy load pages
const LoginPage = lazy(() => import('@/features/auth/LoginPage'))
const AppLayout = lazy(() => import('@/components/layout/AppLayout'))
const OverviewPage = lazy(() => import('@/features/dashboard/OverviewPage'))
const ShopFloorPage = lazy(() => import('@/features/shopfloor/ShopFloorPage'))
const DowntimeLogsPage = lazy(() => import('@/features/downtime/DowntimeLogsPage'))
const ImportCenterPage = lazy(() => import('@/features/imports/ImportCenterPage'))
const MachineAnalyticsPage = lazy(() => import('@/features/machines/MachineAnalyticsPage'))
const PredictiveMaintenancePage = lazy(() => import('@/features/predictive/PredictiveMaintenancePage'))
const FinancialLossPage = lazy(() => import('@/features/financial/FinancialLossPage'))
const ShiftAnalyticsPage = lazy(() => import('@/features/shifts/ShiftAnalyticsPage'))
const ReportsPage = lazy(() => import('@/features/reports/ReportsPage'))
const SettingsPage = lazy(() => import('@/features/settings/SettingsPage'))

const router = createBrowserRouter([
  {
    path: '/login',
    element: (
      <Suspense fallback={<div>Loading...</div>}>
        <LoginPage />
      </Suspense>
    ),
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <Suspense fallback={<div>Loading...</div>}>
          <AppLayout />
        </Suspense>
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: (
          <Suspense fallback={<div>Loading...</div>}>
            <OverviewPage />
          </Suspense>
        ),
      },
      {
        path: 'shop-floor',
        element: (
          <Suspense fallback={<div>Loading...</div>}>
            <ShopFloorPage />
          </Suspense>
        ),
      },
      {
        path: 'predictive-maintenance',
        element: (
          <Suspense fallback={<div>Loading...</div>}>
            <PredictiveMaintenancePage />
          </Suspense>
        ),
      },
      {
        path: 'loss-calculator',
        element: (
          <Suspense fallback={<div>Loading...</div>}>
            <FinancialLossPage />
          </Suspense>
        ),
      },
      {
        path: 'downtime-logs',
        element: (
          <Suspense fallback={<div>Loading...</div>}>
            <DowntimeLogsPage />
          </Suspense>
        ),
      },
      {
        path: 'machines',
        element: (
          <Suspense fallback={<div>Loading...</div>}>
            <MachineAnalyticsPage />
          </Suspense>
        ),
      },
      {
        path: 'shifts',
        element: (
          <Suspense fallback={<div>Loading...</div>}>
            <ShiftAnalyticsPage />
          </Suspense>
        ),
      },
      {
        path: 'imports',
        element: (
          <Suspense fallback={<div>Loading...</div>}>
            <ImportCenterPage />
          </Suspense>
        ),
      },
      {
        path: 'reports',
        element: (
          <Suspense fallback={<div>Loading...</div>}>
            <ReportsPage />
          </Suspense>
        ),
      },
      {
        path: 'settings',
        element: (
          <Suspense fallback={<div>Loading...</div>}>
            <SettingsPage />
          </Suspense>
        ),
      },
    ],
  },
])

export default router
