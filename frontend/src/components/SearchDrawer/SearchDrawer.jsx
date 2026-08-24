import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import styles from "./SearchDrawer.module.css";
import Avatar from "../Avatar/Avatar";
import API from "../../api/axios";

const getLoggedInUsername = () => {
  const token = localStorage.getItem("token");
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.username;
  } catch (e) {
    console.error("Failed to decode token inside SearchDrawer helper:", e);
    return null;
  }
};

const getStorageKey = () => {
  const username = getLoggedInUsername();
  return username ? `recentlyViewed_${username}` : "recentlyViewed_guest";
};

const getSavedRecentlyViewed = () => {
  const key = getStorageKey();
  const saved = localStorage.getItem(key);
  return saved ? JSON.parse(saved) : [];
};

const SearchDrawer = ({ isOpen, onClose }) => {
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const location = useLocation();

  const [recentlyViewed, setRecentlyViewed] = useState([]);

  const [shouldRender, setShouldRender] = useState(isOpen);
  const [isClosing, setIsClosing] = useState(false);

  const prevIsOpenRef = useRef(isOpen);

  useEffect(() => {
    const prevIsOpen = prevIsOpenRef.current;
    prevIsOpenRef.current = isOpen;

    if (isOpen && !prevIsOpen) {
      setShouldRender(true);
      setIsClosing(false);
      setRecentlyViewed(getSavedRecentlyViewed());
    } else if (!isOpen && prevIsOpen) {
      setIsClosing(true);
      setSearchQuery("");
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isClosing) return;

    const timer = setTimeout(() => {
      setShouldRender(false);
      setIsClosing(false);
    }, 250);

    return () => clearTimeout(timer);
  }, [isClosing]);

  useEffect(() => {
    if (!isOpen) return;

    document.body.style.overflow = "hidden";

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  const prevPathRef = useRef(location.pathname);

  useEffect(() => {
    if (prevPathRef.current !== location.pathname) {
      prevPathRef.current = location.pathname;
      if (isOpen) {
        onClose();
      }
    }
  }, [location.pathname, isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    if (users.length > 0) return;

    const fetchUsers = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem("token");

        if (!token) {
          setError("You must be logged in to search profiles.");
          return;
        }

        const response = await API.get("/api/users/search/all", {
          headers: { Authorization: `Bearer ${token}` },
        });

        setUsers(response.data);
      } catch (err) {
        console.error("=== SEARCH DRAWER FETCH ERROR ===", err.message);
        setError(err.response?.data?.message || err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [isOpen, users.length]);

  const addToRecentlyViewed = (user) => {
    setRecentlyViewed((prevList) => {
      const filtered = prevList.filter((item) => item._id !== user._id);
      const updated = [user, ...filtered].slice(0, 5);

      const key = getStorageKey();
      localStorage.setItem(key, JSON.stringify(updated));
      return updated;
    });
  };

  const clearRecentlyViewed = () => {
    const key = getStorageKey();
    localStorage.removeItem(key);
    setRecentlyViewed([]);
  };

  const getProfileLink = (targetUsername) => {
    const currentUsername = getLoggedInUsername();
    if (!targetUsername) return "/profile";

    if (
      currentUsername &&
      currentUsername.toLowerCase() === targetUsername.toLowerCase()
    ) {
      return "/profile";
    }
    return `/user/${targetUsername}`;
  };

  const filteredUsers =
    searchQuery.trim() === ""
      ? users
      : users.filter((user) =>
          user.username.toLowerCase().includes(searchQuery.toLowerCase()),
        );

  if (!shouldRender) return null;

  const renderSkeletons = () => (
    <>
      {[1, 2, 3, 4].map((n) => (
        <div key={n} className={styles.skeletonUserItem}>
          <div
            className={`${styles.skeletonAvatarCircle} ${styles.skeletonPulse}`}
          />
          <div
            className={`${styles.skeletonUsernameLine} ${styles.skeletonPulse}`}
          />
        </div>
      ))}
    </>
  );

  return (
    <div
      className={`${styles.overlay} ${isClosing ? styles.overlayLeaving : ""}`}
      onClick={onClose}
    >
      <div
        className={`${styles.drawerBox} ${isClosing ? styles.drawerLeaving : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.drawerIndicator} onClick={onClose} />

        <h2 className={styles.title}>Search</h2>

        <div className={styles.searchBarWrapper}>
          <input
            type="text"
            placeholder="Search"
            className={styles.searchInput}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery ? (
            <button
              className={styles.clearButton}
              onClick={() => setSearchQuery("")}
            >
              ✕
            </button>
          ) : (
            <button className={styles.clearButton} onClick={onClose}>
              ✕
            </button>
          )}
        </div>

        <hr className={styles.divider} />

        <div className={styles.resultsContainer}>
          {searchQuery.trim() === "" ? (
            recentlyViewed.length > 0 ? (
              <>
                <div className={styles.recentHeaderWrapper}>
                  <span className={styles.sectionTitle}>Recent</span>
                  <button
                    className={styles.clearRecentButton}
                    onClick={clearRecentlyViewed}
                  >
                    Clear all
                  </button>
                </div>
                <div className={styles.usersList}>
                  {recentlyViewed.map((user) => (
                    <Link
                      key={`recent-${user._id}`}
                      to={getProfileLink(user.username)}
                      className={styles.userItem}
                      onClick={() => {
                        addToRecentlyViewed(user);
                        onClose();
                      }}
                    >
                      <Avatar user={user} size={44} />
                      <span className={styles.username}>{user.username}</span>
                    </Link>
                  ))}
                </div>
              </>
            ) : (
              <>
                <span className={styles.sectionTitle}>Suggestions</span>
                <div className={styles.usersList}>
                  {loading && renderSkeletons()}

                  {error && (
                    <p
                      className={styles.statusMessage}
                      style={{ color: "#ed4956" }}
                    >
                      {error}
                    </p>
                  )}

                  {!loading &&
                    !error &&
                    users.map((user) => (
                      <Link
                        key={`suggested-${user._id}`}
                        to={getProfileLink(user.username)}
                        className={styles.userItem}
                        onClick={() => {
                          addToRecentlyViewed(user);
                          onClose();
                        }}
                      >
                        <Avatar user={user} size={44} />
                        <span className={styles.username}>{user.username}</span>
                      </Link>
                    ))}
                </div>
              </>
            )
          ) : (
            <>
              <span className={styles.sectionTitle}>Search Results</span>
              <div className={styles.usersList}>
                {loading && renderSkeletons()}

                {error && (
                  <p
                    className={styles.statusMessage}
                    style={{ color: "#ed4956" }}
                  >
                    {error}
                  </p>
                )}

                {!loading && !error && filteredUsers.length > 0
                  ? filteredUsers.map((user) => (
                      <Link
                        key={`search-${user._id}`}
                        to={getProfileLink(user.username)}
                        className={styles.userItem}
                        onClick={() => {
                          addToRecentlyViewed(user);
                          onClose();
                        }}
                      >
                        <Avatar user={user} size={44} />
                        <span className={styles.username}>{user.username}</span>
                      </Link>
                    ))
                  : !loading &&
                    !error && (
                      <p className={styles.statusMessage}>No users found</p>
                    )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchDrawer;
