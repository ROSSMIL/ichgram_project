import { useState, useEffect } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import API from "../../api/axios";
import styles from "./Sidebar.module.css";
import logoImg from "../../assets/logo.png";
import Avatar from "../Avatar/Avatar";
import CreatePostModal from "../CreatePostModal/CreatePostModal";

const Sidebar = ({ onSearchToggle, isSearchOpen }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem("token");
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split(".")[1]));
          setCurrentUser(payload);

          const { data: userData } = await API.get("/api/users/profile", {
            headers: { Authorization: `Bearer ${token}` },
          });
          setCurrentUser(userData);
        } catch (e) {
          console.error("Failed to load user inside Sidebar:", e);
        }
      }
    };

    fetchUser();
    window.addEventListener("profileUpdated", fetchUser);

    return () => {
      window.removeEventListener("profileUpdated", fetchUser);
    };
  }, []);

  const handlePostCreated = (newPost) => {
    console.log("Post created successfully:", newPost);
    window.dispatchEvent(new CustomEvent("postCreated", { detail: newPost }));
  };

  const triggerDashboardRefresh = () => {
    console.log("Refreshing dashboard...");
    window.dispatchEvent(new CustomEvent("refreshDashboard"));
  };

  const handleHomeClick = (e) => {
    if (location.pathname === "/dashboard") {
      e.preventDefault();
      triggerDashboardRefresh();
    }
  };

  const handleLogoClick = () => {
    if (location.pathname === "/dashboard") {
      triggerDashboardRefresh();
    } else {
      navigate("/dashboard");
    }
  };

  const handleExploreClick = (e) => {
    if (location.pathname === "/explore") {
      e.preventDefault();
      console.log("Refreshing explore...");
      window.dispatchEvent(new CustomEvent("refreshExplore"));
    }
  };

  return (
    <>
      <div className={styles.sidebar}>
        <div
          className={styles.logoContainer}
          onClick={handleLogoClick}
          style={{ cursor: "pointer" }}
        >
          <img src={logoImg} alt="ICHGRAM" className={styles.logo} />
        </div>

        <nav className={styles.navMenu}>
          {/* Home */}
          <NavLink
            to="/dashboard"
            data-nav="home"
            onClick={handleHomeClick}
            className={({ isActive }) =>
              isActive ? `${styles.navItem} ${styles.active}` : styles.navItem
            }
          >
            {({ isActive }) => (
              <>
                <span className={styles.icon}>
                  <svg
                    aria-label="Home"
                    color="rgb(0, 0, 0)"
                    fill="rgb(0, 0, 0)"
                    height="24"
                    role="img"
                    viewBox="0 0 24 24"
                    width="24"
                  >
                    {isActive ? (
                      <path
                        d="M22 9.24V20a2 2 0 0 1-2 2h-3a2 2 0 0 1-2-2v-6H9v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9.24a2 2 0 0 1 .73-1.53l7-5.9a2 2 0 0 1 2.54 0l7 5.9a2 2 0 0 1 .73 1.53Z"
                        fill="currentColor"
                      />
                    ) : (
                      <path
                        d="M9.005 22v-6a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v6a1 1 0 0 0 1 1h3a2 2 0 0 0 2-2V10.702a2 2 0 0 0-.586-1.414l-7.707-7.707a2 2 0 0 0-2.828 0L2.586 9.288A2 2 0 0 0 2 10.702V20a2 2 0 0 0 2 2h3a2 2 0 0 0 2-2Z"
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                      />
                    )}
                  </svg>
                </span>
                <span className={styles.text}>Home</span>
              </>
            )}
          </NavLink>

          {/* Search */}
          <div
            data-nav="search"
            onClick={onSearchToggle}
            className={
              isSearchOpen
                ? `${styles.navItem} ${styles.active}`
                : styles.navItem
            }
            style={{ cursor: "pointer" }}
          >
            <span className={styles.icon}>
              <svg
                aria-label="Search"
                color="rgb(0, 0, 0)"
                fill="rgb(0, 0, 0)"
                height="24"
                role="img"
                viewBox="0 0 24 24"
                width="24"
              >
                <path
                  d="M19 10.5A8.5 8.5 0 1 1 10.5 2a8.5 8.5 0 0 1 8.5 8.5Z"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={isSearchOpen ? "3" : "2"}
                />
                <line
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={isSearchOpen ? "3" : "2"}
                  x1="16.511"
                  x2="22"
                  y1="16.511"
                  y2="22"
                />
              </svg>
            </span>
            <span className={styles.text}>Search</span>
          </div>

          {/* Explore */}
          <NavLink
            to="/explore"
            data-nav="explore"
            onClick={handleExploreClick}
            className={({ isActive }) =>
              isActive ? `${styles.navItem} ${styles.active}` : styles.navItem
            }
          >
            {({ isActive }) => (
              <>
                <span className={styles.icon}>
                  <svg
                    aria-label="Explore"
                    color="rgb(0, 0, 0)"
                    fill="rgb(0, 0, 0)"
                    height="24"
                    role="img"
                    viewBox="0 0 24 24"
                    width="24"
                  >
                    <polygon
                      fill={isActive ? "currentColor" : "none"}
                      points="13.941 13.953 7.581 16.424 10.06 10.056 16.42 7.585 13.941 13.953"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                    />
                    <circle
                      fill="none"
                      cx="12.004"
                      cy="12.004"
                      r="10.5"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                    />
                  </svg>
                </span>
                <span className={styles.text}>Explore</span>
              </>
            )}
          </NavLink>

          {/* Messages */}
          <NavLink
            to="/messages"
            data-nav="messages"
            className={({ isActive }) =>
              isActive ? `${styles.navItem} ${styles.active}` : styles.navItem
            }
          >
            {({ isActive }) => (
              <>
                <span className={styles.icon}>
                  <svg
                    aria-label="Direct"
                    color="rgb(0, 0, 0)"
                    fill="rgb(0, 0, 0)"
                    height="24"
                    role="img"
                    viewBox="0 0 24 24"
                    width="24"
                  >
                    <line
                      fill="none"
                      stroke="currentColor"
                      strokeLinejoin="round"
                      strokeWidth={isActive ? "2.5" : "2"}
                      x1="22"
                      x2="9.218"
                      y1="2"
                      y2="10.083"
                    />
                    <polygon
                      fill={isActive ? "currentColor" : "none"}
                      points="22 2 1.93 9.312 8.781 12.656 12.125 19.507 22 2"
                      stroke="currentColor"
                      strokeLinejoin="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                    />
                  </svg>
                </span>
                <span className={styles.text}>Messages</span>
              </>
            )}
          </NavLink>

          {/* Notifications */}
          <NavLink
            to="/notifications"
            data-nav="notifications"
            className={({ isActive }) =>
              isActive ? `${styles.navItem} ${styles.active}` : styles.navItem
            }
          >
            {({ isActive }) => (
              <>
                <span className={styles.icon}>
                  <svg
                    aria-label="Notifications"
                    color="rgb(0, 0, 0)"
                    fill="rgb(0, 0, 0)"
                    height="24"
                    role="img"
                    viewBox="0 0 24 24"
                    width="24"
                  >
                    <path
                      d="M16.792 3.904A4.989 4.989 0 0 1 21.5 9.122c0 3.072-2.65 5.618-5.91 8.526L12 21l-3.59-3.352C5.15 14.74 2.5 12.194 2.5 9.122a4.989 4.989 0 0 1 4.708-5.218 4.21 4.21 0 0 1 3.675 1.941L12 7.428l1.117-1.775a4.21 4.21 0 0 1 3.675-1.949Z"
                      fill={isActive ? "currentColor" : "none"}
                      stroke="currentColor"
                      strokeLinejoin="round"
                      strokeWidth="2"
                    />
                  </svg>
                </span>
                <span className={styles.text}>Notifications</span>
              </>
            )}
          </NavLink>

          {/* Create */}
          <div
            data-nav="create"
            onClick={() => setIsCreateModalOpen(true)}
            className={styles.navItem}
            style={{ cursor: "pointer" }}
          >
            <span className={styles.icon}>
              <svg
                aria-label="New post"
                color="rgb(0, 0, 0)"
                fill="rgb(0, 0, 0)"
                height="24"
                role="img"
                viewBox="0 0 24 24"
                width="24"
              >
                <path
                  d="M2 12v10a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v10Z"
                  fill={isCreateModalOpen ? "currentColor" : "none"}
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                />
                <line
                  fill="none"
                  stroke={isCreateModalOpen ? "#fff" : "currentColor"}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  x1="6.525"
                  x2="17.478"
                  y1="12"
                  y2="12"
                />
                <line
                  fill="none"
                  stroke={isCreateModalOpen ? "#fff" : "currentColor"}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  x1="12.001"
                  x2="12.001"
                  y1="6.525"
                  y2="17.478"
                />
              </svg>
            </span>
            <span className={styles.text}>Create</span>
          </div>

          {/* Profile */}
          <NavLink
            to="/profile"
            data-nav="profile"
            className={({ isActive }) =>
              isActive ? `${styles.navItem} ${styles.active}` : styles.navItem
            }
            id={styles.profile}
          >
            <div className={styles.avatarWrapper}>
              <Avatar user={currentUser} size={24} />
            </div>
            <span className={styles.text}>Profile</span>
          </NavLink>
        </nav>
      </div>

      <CreatePostModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        currentUser={currentUser}
        onPostCreated={handlePostCreated}
      />
    </>
  );
};

export default Sidebar;
