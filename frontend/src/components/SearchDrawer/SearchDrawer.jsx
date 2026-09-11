import { useState, useEffect, useRef } from "react";
import PropTypes from "prop-types";
import { Link, useLocation } from "react-router-dom";
import styles from "./SearchDrawer.module.css";
import Avatar from "../Avatar/Avatar";
import Input from "../Input/Input";
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
  const [isClearing, setIsClearing] = useState(false);

  const [isExpanded, setIsExpanded] = useState(false);
  const touchStartY = useRef(0);

  const prevIsOpenRef = useRef(isOpen);

  useEffect(() => {
    const prevIsOpen = prevIsOpenRef.current;
    prevIsOpenRef.current = isOpen;

    if (isOpen && !prevIsOpen) {
      setShouldRender(true);
      setIsClosing(false);
      setIsClearing(false);
      setIsExpanded(false);
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
      setIsExpanded(false);
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

  useEffect(() => {
    const preventGesture = (e) => {
      e.preventDefault();
    };

    document.addEventListener("gesturestart", preventGesture);
    document.addEventListener("gesturechange", preventGesture);

    return () => {
      document.removeEventListener("gesturestart", preventGesture);
      document.removeEventListener("gesturechange", preventGesture);
    };
  }, []);

  const saveToRecentlyViewedQuietly = (user) => {
    const currentList = getSavedRecentlyViewed();
    const filtered = currentList.filter((item) => item._id !== user._id);
    const updated = [user, ...filtered].slice(0, 5);

    const key = getStorageKey();
    localStorage.setItem(key, JSON.stringify(updated));
  };

  const clearRecentlyViewed = () => {
    setIsClearing(true);
    setTimeout(() => {
      const key = getStorageKey();
      localStorage.removeItem(key);
      setRecentlyViewed([]);
      setIsClearing(false);
    }, 280);
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

  const handleTouchStart = (e) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e) => {
    const touchEndY = e.changedTouches[0].clientY;
    const diff = touchStartY.current - touchEndY;

    if (diff > 50) {
      setIsExpanded(true);
    } else if (diff < -50) {
      if (isExpanded) {
        setIsExpanded(false);
      } else {
        onClose();
      }
    }
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
        className={`${styles.drawerBox} ${
          isClosing ? styles.drawerLeaving : ""
        } ${isExpanded ? styles.drawerExpanded : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={styles.drawerIndicator}
          onClick={() => setIsExpanded((prev) => !prev)}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        />

        <h2 className={styles.title}>Search</h2>

        <div className={styles.searchBarWrapper}>
          <Input
            type="text"
            placeholder="Who are you looking for?"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.customSearchInput}
          />
          {searchQuery && (
            <button
              type="button"
              className={styles.clearButton}
              onClick={() => setSearchQuery("")}
            >
              ✕
            </button>
          )}
        </div>

        <div className={styles.resultsContainer}>
          {searchQuery.trim() === "" ? (
            recentlyViewed.length > 0 ? (
              <div
                className={`${styles.animSectionWrapper} ${
                  isClearing ? styles.sectionClearing : ""
                }`}
              >
                <div className={styles.recentHeaderWrapper}>
                  <span className={styles.sectionTitle}>Recent</span>
                  <button
                    className={styles.clearRecentButton}
                    onClick={clearRecentlyViewed}
                    disabled={isClearing}
                  >
                    Clear all
                  </button>
                </div>
                <div className={styles.usersList}>
                  {recentlyViewed.map((user, idx) => (
                    <Link
                      key={`recent-${user._id}`}
                      to={getProfileLink(user.username)}
                      className={styles.userItem}
                      style={{ "--stagger-index": idx }}
                      onClick={() => {
                        saveToRecentlyViewedQuietly(user);
                        onClose();
                      }}
                    >
                      <Avatar user={user} size={42} />
                      <div className={styles.userInfoText}>
                        <span className={styles.username}>{user.username}</span>
                        {user.fullName && (
                          <span className={styles.userFullName}>
                            {user.fullName}
                          </span>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ) : (
              <div className={styles.animSectionWrapper}>
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
                    users.map((user, idx) => (
                      <Link
                        key={`suggested-${user._id}`}
                        to={getProfileLink(user.username)}
                        className={styles.userItem}
                        style={{ "--stagger-index": idx }}
                        onClick={() => {
                          saveToRecentlyViewedQuietly(user);
                          onClose();
                        }}
                      >
                        <Avatar user={user} size={42} />
                        <div className={styles.userInfoText}>
                          <span className={styles.username}>
                            {user.username}
                          </span>
                          {user.fullName && (
                            <span className={styles.userFullName}>
                              {user.fullName}
                            </span>
                          )}
                        </div>
                      </Link>
                    ))}
                </div>
              </div>
            )
          ) : (
            <div className={styles.animSectionWrapper}>
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
                  ? filteredUsers.map((user, idx) => (
                      <Link
                        key={`search-${user._id}`}
                        to={getProfileLink(user.username)}
                        className={styles.userItem}
                        style={{ "--stagger-index": idx }}
                        onClick={() => {
                          saveToRecentlyViewedQuietly(user);
                          onClose();
                        }}
                      >
                        <Avatar user={user} size={42} />
                        <div className={styles.userInfoText}>
                          <span className={styles.username}>
                            {user.username}
                          </span>
                          {user.fullName && (
                            <span className={styles.userFullName}>
                              {user.fullName}
                            </span>
                          )}
                        </div>
                      </Link>
                    ))
                  : !loading &&
                    !error && (
                      <p className={styles.statusMessage}>No users found</p>
                    )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

SearchDrawer.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default SearchDrawer;
