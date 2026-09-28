import { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate,
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
import PostModal from "./components/PostModal/PostModal";
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
import GlobalServerError from "./components/GlobalServerError/GlobalServerError";
import ScrollToTopButton from "./components/ScrollToTopButton/ScrollToTopButton";
import API from "./api/axios";
import "./App.css";

const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }

    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;

    const mainContent =
      document.querySelector(".app-content") || document.querySelector("main");

    if (mainContent) {
      mainContent.scrollTop = 0;
    }
  }, [pathname]);

  return null;
};

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem("token");
  const navigate = useNavigate();

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState(null);

  const [activePostModal, setActivePostModal] = useState(null);
  const [autoFocusComment, setAutoFocusComment] = useState(false);

  useAutoLogout();

  useEffect(() => {
    const handleOpenEdit = (e) => {
      setEditingPost(e.detail);
      setIsCreateModalOpen(true);
    };

    const handleOpenPostModal = async (e) => {
      const { postId, post, focusComment } = e.detail || {};
      const isMobile = window.innerWidth <= 768;

      if (isMobile) {
        if (postId || post?._id) {
          navigate(
            `/post/${postId || post._id}${focusComment ? "?focus=true" : ""}`,
          );
        }
        return;
      }

      setAutoFocusComment(Boolean(focusComment));

      if (post) {
        setActivePostModal(post);
      } else if (postId) {
        try {
          const { data } = await API.get(`/api/posts/${postId}`);
          setActivePostModal(data);
        } catch (err) {
          console.error("Error fetching post for global modal:", err);
        }
      }
    };

    window.addEventListener("openEditPost", handleOpenEdit);
    window.addEventListener("openPostModal", handleOpenPostModal);

    return () => {
      window.removeEventListener("openEditPost", handleOpenEdit);
      window.removeEventListener("openPostModal", handleOpenPostModal);
    };
  }, [navigate]);

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

      {activePostModal && (
        <PostModal
          post={activePostModal}
          onClose={() => {
            setActivePostModal(null);
            setAutoFocusComment(false);
          }}
          autoFocusComment={autoFocusComment}
          onPostUpdate={(updatedPost) => {
            setActivePostModal(updatedPost);
            handlePostUpdated(updatedPost);
          }}
        />
      )}

      <ScrollToTopButton />
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
  const [isServerError, setIsServerError] = useState(false);
  const [retryTrigger, setRetryTrigger] = useState(0);

  useEffect(() => {
    const handleGlobalMaintenance = () => {
      setIsServerError(true);
    };

    window.addEventListener("globalServerMaintenance", handleGlobalMaintenance);

    return () => {
      window.removeEventListener(
        "globalServerMaintenance",
        handleGlobalMaintenance,
      );
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const runHealthCheck = async () => {
      const token = localStorage.getItem("token");

      const minDisplayTime = new Promise((resolve) =>
        setTimeout(resolve, 1200),
      );

      try {
        if (token) {
          await API.get("/api/users/profile");
        }
      } catch (e) {
        console.warn("Server warmup check error:", e);

        if (isMounted) {
          const isNetworkDown = !e.response;
          const isServer5xx =
            e.response && [502, 503, 504].includes(e.response.status);

          if (isNetworkDown || isServer5xx) {
            setIsServerError(true);
          }
        }
      } finally {
        await minDisplayTime;
        if (isMounted) {
          setIsAppReady(true);
        }
      }
    };

    runHealthCheck();

    return () => {
      isMounted = false;
    };
  }, [retryTrigger]);

  const handleServerRestored = () => {
    setIsServerError(false);
    setIsAppReady(true);
    setRetryTrigger((prev) => prev + 1);

    setTimeout(() => {
      window.dispatchEvent(new CustomEvent("forceSocketReconnect"));
      window.dispatchEvent(new CustomEvent("refreshDashboard"));
    }, 200);
  };

  return (
    <Router>
      <SocketProvider>
        <AppSplashScreen isFinished={isAppReady} />

        <ScrollToTop />

        {isServerError ? (
          <GlobalServerError onSuccess={handleServerRestored} />
        ) : (
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
        )}
      </SocketProvider>
    </Router>
  );
}

export default App;
