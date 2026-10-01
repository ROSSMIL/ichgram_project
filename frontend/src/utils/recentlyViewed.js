export const getLoggedInUsername = () => {
  const token = localStorage.getItem("token");
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.username;
  } catch (e) {
    console.error("Failed to decode token:", e);
    return null;
  }
};

export const getStorageKey = () => {
  const username = getLoggedInUsername();
  return username ? `recentlyViewed_${username}` : "recentlyViewed_guest";
};

export const getSavedRecentlyViewed = () => {
  const key = getStorageKey();
  const saved = localStorage.getItem(key);
  if (!saved) return [];

  try {
    const parsed = JSON.parse(saved);

    return parsed.map((user) => {
      const isDeleted =
        user.isDeleted ||
        user.username?.toLowerCase().startsWith("deleted_user_") ||
        user.fullName === "Account Deleted" ||
        user.fullName === "Deleted User";

      if (isDeleted) {
        return {
          ...user,
          username: "Deleted User",
          fullName: "Account Deleted",
          avatar: "",
          isDeleted: true,
        };
      }
      return user;
    });
  } catch (e) {
    console.error("Failed to parse recently viewed storage:", e);
    return [];
  }
};

export const saveToRecentlyViewed = (user) => {
  if (!user || !user._id) return;

  const isDeleted =
    user.isDeleted ||
    user.username?.toLowerCase().startsWith("deleted_user_") ||
    user.fullName === "Account Deleted" ||
    user.fullName === "Deleted User";

  if (isDeleted) {
    return;
  }

  const currentUsername = getLoggedInUsername();
  if (
    currentUsername &&
    user.username &&
    currentUsername.toLowerCase() === user.username.toLowerCase()
  ) {
    return;
  }

  const currentList = getSavedRecentlyViewed();
  const filtered = currentList.filter((item) => item._id !== user._id);

  const userToSave = {
    _id: user._id,
    username: user.username,
    fullName: user.fullName || "",
    avatar: user.avatar || "",
  };

  const updated = [userToSave, ...filtered].slice(0, 5);

  const key = getStorageKey();
  localStorage.setItem(key, JSON.stringify(updated));
};

export const clearRecentlyViewedStorage = () => {
  const key = getStorageKey();
  localStorage.removeItem(key);
};
