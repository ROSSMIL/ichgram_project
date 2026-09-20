import { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
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
import ActivityWidget from "./components/ActivityWidget/ActivityWidget";
import ProfileDropdown from "./components/ProfileDropdown/ProfileDropdown";
import Footer from "./components/Footer/Footer";
import SearchDrawer from "./components/SearchDrawer/SearchDrawer";
import NotificationsDrawer from "./components/NotificationsDrawer/NotificationsDrawer";
import NotFoundPage from "./pages/NotFoundPage/NotFoundPage";
import useAutoLogout from "./hooks/useAutoLogout";
import MessagesPage from "./pages/MessagesPage/MessagesPage";
import { SocketProvider } from "./context/SocketContext.jsx";
import AppSplashScreen from "./components/AppSplashScreen/AppSplashScreen";
import API from "./api/axios";
import "./App.css";

const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem("token");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState(null);

  useAutoLogout();

  useEffect(() => {
    const handleOpenEdit = (e) => {
      setEditingPost(e.detail);
      setIsCreateModalOpen(true);
    };

    window.addEventListener("openEditPost", handleOpenEdit);
    return () => {
      window.removeEventListener("openEditPost", handleOpenEdit);
    };
  }, []);

  const openCreateModal = () => {
    setEditingPost(null);
    setIsCreateModalOpen(true);
  };

  const closeCreateModal = () => {
    setIsCreateModalOpen(false);
    setEditingPost(null);
  };

  const handlePostUpdated = (updatedPost) => {
    window.dispatchEvent(
      new CustomEvent("postUpdated", { detail: updatedPost }),
    );
  };

  const toggleSearch = () => {
    setIsNotificationsOpen(false);
    setIsSearchOpen((prev) => !prev);
  };

  const toggleNotifications = () => {
    setIsSearchOpen(false);
    setIsNotificationsOpen((prev) => !prev);
  };

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="app-container">
      <div className="left-column">
        <Sidebar
          onSearchToggle={toggleSearch}
          isSearchOpen={isSearchOpen}
          onNotificationsToggle={toggleNotifications}
          isNotificationsOpen={isNotificationsOpen}
          openCreateModal={openCreateModal}
        />
        <ActivityWidget />
      </div>

      <ProfileDropdown />

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

      <NotificationsDrawer
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
      />

      <CreatePostModal
        isOpen={isCreateModalOpen}
        onClose={closeCreateModal}
        editingPost={editingPost}
        onPostUpdated={handlePostUpdated}
      />
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
  const [isAppReady, setIsAppReady] = useState(false);

  useEffect(() => {
    const checkServerHealth = async () => {
      const token = localStorage.getItem("token");
      const minDisplayTime = new Promise((resolve) =>
        setTimeout(resolve, 1200),
      );

      try {
        if (token) {
          await API.get("/api/users/profile", {
            headers: { Authorization: `Bearer ${token}` },
          });
        }
      } catch (e) {
        console.warn("Server warmup check finished or unauthenticated:", e);
      } finally {
        await minDisplayTime;
        setIsAppReady(true);
      }
    };

    checkServerHealth();
  }, []);

  return (
    <Router>
      <SocketProvider>
        <AppSplashScreen isFinished={isAppReady} />

        <ScrollToTop />
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
                <MessagesPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/notifications"
            element={<Navigate to="/dashboard" replace />}
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
      </SocketProvider>
    </Router>
  );
}

export default App;
