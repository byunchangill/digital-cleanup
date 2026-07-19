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
        {/* 미정의 경로는 로그인으로 */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
