import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/auth/LoginPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import SetNewPasswordPage from './pages/auth/SetNewPasswordPage';
import AccountRecoveryPage from './pages/auth/AccountRecoveryPage';
import HomePage from './pages/home/HomePage';
import SearchResultsPage from './pages/home/SearchResultsPage';
import GalleryImportPage from './pages/item/GalleryImportPage';
import MemoWritingPage from './pages/item/MemoWritingPage';
import ItemDetailPage from './pages/item/ItemDetailPage';
import FavoritesPage from './pages/item/FavoritesPage';
import BulkSelectionPage from './pages/item/BulkSelectionPage';
import CleanupDashboardPage from './pages/cleanup/CleanupDashboardPage';
import DuplicateReviewPage from './pages/cleanup/DuplicateReviewPage';
import ScreenshotCleanupPage from './pages/cleanup/ScreenshotCleanupPage';
import CleanupReportPage from './pages/cleanup/CleanupReportPage';
import CleanupSettingsPage from './pages/cleanup/CleanupSettingsPage';
import PinEntryPage from './pages/vault/PinEntryPage';
import SecretItemDetailPage from './pages/vault/SecretItemDetailPage';
import PrivacyControlsPage from './pages/vault/PrivacyControlsPage';
import MyHomePage from './pages/my/MyHomePage';
import NotificationsPage from './pages/my/NotificationsPage';
import ExportPage from './pages/my/ExportPage';
import StoragePage from './pages/my/StoragePage';
import PlanPage from './pages/my/PlanPage';
import AccountDeletePage from './pages/my/AccountDeletePage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/password/reset" element={<ResetPasswordPage />} />
        <Route path="/password/new" element={<SetNewPasswordPage />} />
        <Route path="/recovery" element={<AccountRecoveryPage />} />
        {/* home 모듈 */}
        <Route path="/home" element={<HomePage />} />
        <Route path="/search" element={<SearchResultsPage />} />
        {/* item 모듈 */}
        <Route path="/import" element={<GalleryImportPage />} />
        <Route path="/items/new-memo" element={<MemoWritingPage />} />
        <Route path="/items/:id" element={<ItemDetailPage />} />
        <Route path="/favorites" element={<FavoritesPage />} />
        <Route path="/library" element={<BulkSelectionPage />} />
        {/* cleanup 모듈 */}
        <Route path="/cleanup" element={<CleanupDashboardPage />} />
        <Route path="/cleanup/duplicates" element={<DuplicateReviewPage />} />
        <Route path="/cleanup/screenshots" element={<ScreenshotCleanupPage />} />
        <Route path="/cleanup/report" element={<CleanupReportPage />} />
        <Route path="/cleanup/settings" element={<CleanupSettingsPage />} />
        {/* vault 모듈 */}
        <Route path="/vault/unlock" element={<PinEntryPage />} />
        <Route path="/vault/items/:id" element={<SecretItemDetailPage />} />
        <Route path="/my/privacy" element={<PrivacyControlsPage />} />
        {/* my 모듈 */}
        <Route path="/my" element={<MyHomePage />} />
        <Route path="/my/notifications" element={<NotificationsPage />} />
        <Route path="/my/export" element={<ExportPage />} />
        <Route path="/my/storage" element={<StoragePage />} />
        <Route path="/my/plan" element={<PlanPage />} />
        <Route path="/my/delete-account" element={<AccountDeletePage />} />
        {/* 미정의 경로는 로그인으로 */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
