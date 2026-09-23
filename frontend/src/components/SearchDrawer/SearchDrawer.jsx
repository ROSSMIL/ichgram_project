import { useState, useEffect, useRef, useCallback } from "react";
import PropTypes from "prop-types";
import { Link, useLocation } from "react-router-dom";
import styles from "./SearchDrawer.module.css";
import Avatar from "../Avatar/Avatar";
import Input from "../Input/Input";
import API from "../../api/axios";
import {
  getLoggedInUsername,
  getSavedRecentlyViewed,
  saveToRecentlyViewed,
  clearRecentlyViewedStorage,
} from "../../utils/recentlyViewed";

const SearchDrawer = ({ isOpen, onClose }) => {
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const location = useLocation();

  const [recentlyViewed, setRecentlyViewed] = useState([]);
  const [activeTab, setActiveTab] = useState("recent");
  const [tabDirection, setTabDirection] = useState("right");

  const [shouldRender, setShouldRender] = useState(isOpen);
  const [isClosing, setIsClosing] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const [isExpanded, setIsExpanded] = useState(false);
  const touchStartY = useRef(0);

  const tabsContainerRef = useRef(null);
  const tabsRef = useRef({});
  const [gliderStyle, setGliderStyle] = useState({
    transform: "translateX(0px)",
    width: "0px",
    opacity: 0,
  });

  const updateGlider = useCallback(() => {
    const activeTabEl = tabsRef.current[activeTab];
    const container = tabsContainerRef.current;

    if (activeTabEl && container) {
      const activeRect = activeTabEl.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();

      const leftOffset = activeRect.left - containerRect.left - 3;
      const width = activeRect.width;

      setGliderStyle({
        transform: `translateX(${leftOffset}px)`,
        width: `${width}px`,
        opacity: 1,
      });
    }
  }, [activeTab]);

  useEffect(() => {
    if (!isOpen) return;

    const animationFrame = requestAnimationFrame(() => {
      updateGlider();
    });

    window.addEventListener("resize", updateGlider);

    return () => {
      cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", updateGlider);
    };
  }, [isOpen, updateGlider]);

  const prevIsOpenRef = useRef(isOpen);

  useEffect(() => {
    const prevIsOpen = prevIsOpenRef.current;
    prevIsOpenRef.current = isOpen;

    if (isOpen && !prevIsOpen) {
      setShouldRender(true);
      setIsClosing(false);
      setIsClearing(false);
      setIsExpanded(false);

      const saved = getSavedRecentlyViewed();
      setRecentlyViewed(saved);
      setActiveTab(saved.length > 0 ? "recent" : "suggestions");
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

  const clearRecentlyViewed = () => {
    setIsClearing(true);
    setTimeout(() => {
      clearRecentlyViewedStorage();
      setRecentlyViewed([]);
      setTabDirection("right");
      setActiveTab("suggestions");
      setIsClearing(false);
    }, 260);
  };

  const handleTabChange = (newTab) => {
    if (newTab === activeTab) return;
    setTabDirection(newTab === "suggestions" ? "right" : "left");
    setActiveTab(newTab);
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

  const isSearching = searchQuery.trim() !== "";
  const isRecentActive =
    !isSearching && activeTab === "recent" && recentlyViewed.length > 0;
  const isSuggestionsActive =
    !isSearching && (!isRecentActive || activeTab === "suggestions");

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

        <div className={styles.headerTop}>
          <h2 className={styles.title}>Search</h2>

          {!isSearching && (
            <div ref={tabsContainerRef} className={styles.modeTabs}>
              <div className={styles.glider} style={gliderStyle} />

              <button
                ref={(el) => (tabsRef.current["recent"] = el)}
                type="button"
                className={`${styles.tabBtn} ${
                  activeTab === "recent" ? styles.activeTab : ""
                } ${recentlyViewed.length === 0 ? styles.disabledTab : ""}`}
                onClick={() => {
                  if (recentlyViewed.length > 0) handleTabChange("recent");
                }}
                disabled={recentlyViewed.length === 0}
              >
                Recent
              </button>
              <button
                ref={(el) => (tabsRef.current["suggestions"] = el)}
                type="button"
                className={`${styles.tabBtn} ${
                  activeTab === "suggestions" ? styles.activeTab : ""
                }`}
                onClick={() => handleTabChange("suggestions")}
              >
                Suggestions
              </button>
            </div>
          )}
        </div>

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
          <div className={styles.staticHeaderWrapper}>
            <span
              className={`${styles.sectionTitle} ${
                isSearching ? styles.titleVisible : styles.titleHidden
              }`}
            >
              Search Results
            </span>

            <span
              className={`${styles.sectionTitle} ${
                isRecentActive ? styles.titleVisible : styles.titleHidden
              }`}
            >
              Recently Viewed
            </span>

            <span
              className={`${styles.sectionTitle} ${
                isSuggestionsActive && !isSearching
                  ? styles.titleVisible
                  : styles.titleHidden
              }`}
            >
              Suggestions for you
            </span>

            <button
              className={`${styles.clearRecentButton} ${
                isRecentActive ? styles.clearBtnVisible : styles.clearBtnHidden
              }`}
              onClick={clearRecentlyViewed}
              disabled={isClearing || !isRecentActive}
            >
              Clear all
            </button>
          </div>

          {!isSearching ? (
            isRecentActive ? (
              <div
                key="recent-list"
                className={`${styles.animSectionWrapper} ${
                  tabDirection === "left"
                    ? styles.slideFromLeft
                    : styles.slideFromRight
                } ${isClearing ? styles.sectionClearing : ""}`}
              >
                <div className={styles.usersList}>
                  {recentlyViewed.map((user, idx) => (
                    <Link
                      key={`recent-${user._id}`}
                      to={getProfileLink(user.username)}
                      className={styles.userItem}
                      style={{ "--stagger-index": idx }}
                      onClick={() => {
                        saveToRecentlyViewed(user);
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
              <div
                key="suggestions-list"
                className={`${styles.animSectionWrapper} ${
                  tabDirection === "right"
                    ? styles.slideFromRight
                    : styles.slideFromLeft
                }`}
              >
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
                          saveToRecentlyViewed(user);
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
            <div
              className={`${styles.animSectionWrapper} ${styles.fadeInFast}`}
            >
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
                          saveToRecentlyViewed(user);
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
