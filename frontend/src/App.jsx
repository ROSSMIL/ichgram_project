import { useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import LoginPage from "./pages/LoginPage/LoginPage";
import RegisterPage from "./pages/RegisterPage/RegisterPage";
import DashboardPage from "./pages/DashboardPage/DashboardPage";
import ProfilePage from "./pages/ProfilePage/ProfilePage";
import EditProfilePage from "./pages/EditProfilePage/EditProfilePage";
import UserProfilePage from "./pages/UserProfilePage/UserProfilePage";
import ExplorePage from "./pages/ExplorePage/ExplorePage";
import PostPage from "./pages/PostPage/PostPage";
import CreatePostModal from "./components/CreatePostModal/CreatePostModal";
import Sidebar from "./components/Sidebar/Sidebar";
import Footer from "./components/Footer/Footer";
import SearchDrawer from "./components/SearchDrawer/SearchDrawer";
import ComingSoonPage from "./pages/ComingSoonPage/ComingSoonPage";
import NotFoundPage from "./pages/NotFoundPage/NotFoundPage";
import useAutoLogout from "./hooks/useAutoLogout";
import "./App.css";

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem("token");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useAutoLogout();

  const openCreateModal = () => setIsCreateModalOpen(true);
  const closeCreateModal = () => setIsCreateModalOpen(false);

  const toggleSearch = () => {
    setIsSearchOpen((prev) => !prev);
  };

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="app-container">
      <Sidebar
        onSearchToggle={toggleSearch}
        isSearchOpen={isSearchOpen}
        openCreateModal={openCreateModal}
      />

      <main className="app-content">{children}</main>

      <div className="footer-container">
        <Footer
          onSearchToggle={toggleSearch}
          isSearchOpen={isSearchOpen}
          openCreateModal={openCreateModal}
        />
      </div>

      <SearchDrawer
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />

      <CreatePostModal isOpen={isCreateModalOpen} onClose={closeCreateModal} />
    </div>
  );
};

const PublicOnlyRoute = ({ children }) => {
  const token = localStorage.getItem("token");
  if (token) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        <Route
          path="/login"
          element={
            <PublicOnlyRoute>
              <LoginPage />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicOnlyRoute>
              <RegisterPage />
            </PublicOnlyRoute>
          }
        />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/post/:id"
          element={
            <ProtectedRoute>
              <PostPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/explore"
          element={
            <ProtectedRoute>
              <ExplorePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/user/:username"
          element={
            <ProtectedRoute>
              <UserProfilePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/edit-profile"
          element={
            <ProtectedRoute>
              <EditProfilePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/messages"
          element={
            <ProtectedRoute>
              <ComingSoonPage title="Messages" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <ComingSoonPage title="Notifications" />
            </ProtectedRoute>
          }
        />

        <Route
          path="*"
          element={
            <ProtectedRoute>
              <NotFoundPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
