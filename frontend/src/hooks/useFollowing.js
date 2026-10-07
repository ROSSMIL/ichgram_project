import { useCallback, useEffect, useSyncExternalStore } from "react";
import API from "../api/axios";

const toId = (v) => String(typeof v === "string" ? v : v?._id || v?.id || "");
const normalize = (list) => (list || []).map(toId).filter(Boolean);
const sameIds = (a, b) =>
  a.length === b.length && a.every((id) => b.includes(id));

let state = { ids: [], loaded: false, token: null };
let loadPromise = null;
const listeners = new Set();
const pending = new Map();

const update = (patch) => {
  const next = { ...state, ...patch };
  if (patch.ids && sameIds(patch.ids, state.ids)) next.ids = state.ids;
  if (
    next.ids === state.ids &&
    next.loaded === state.loaded &&
    next.token === state.token
  ) {
    return;
  }
  state = next;
  listeners.forEach((listener) => listener());
};

const ensureLoaded = () => {
  const token = localStorage.getItem("token");

  if (!token) {
    if (state.token !== null) update({ ids: [], loaded: false, token: null });
    return;
  }

  if (state.token !== token) {
    loadPromise = null;
    update({ ids: [], loaded: false, token });
  }

  if (state.loaded || loadPromise) return;

  loadPromise = API.get("/api/users/profile")
    .then(({ data }) => {
      if (localStorage.getItem("token") === token) {
        update({ ids: normalize(data.following), loaded: true });
      }
    })
    .catch((error) => {
      console.error("useFollowing: failed to load following list", error);
    })
    .finally(() => {
      loadPromise = null;
    });
};

const toggleFollow = (targetUserId) => {
  const target = String(targetUserId);
  if (pending.has(target)) return pending.get(target);

  const request = API.post(`/api/users/${target}/follow`, {})
    .then(({ data }) => {
      const nowFollowing =
        typeof data.isFollowing === "boolean"
          ? data.isFollowing
          : !state.ids.includes(target);

      const hasFullList = Array.isArray(data.following);
      const ids = hasFullList
        ? normalize(data.following)
        : nowFollowing
          ? [...new Set([...state.ids, target])]
          : state.ids.filter((id) => id !== target);

      update({
        ids,
        loaded: hasFullList || state.loaded,
        token: localStorage.getItem("token"),
      });

      window.dispatchEvent(
        new CustomEvent("userFollowToggled", {
          detail: {
            targetUserId: target,
            isFollowing: nowFollowing,
            source: "useFollowing",
          },
        }),
      );

      return nowFollowing;
    })
    .finally(() => {
      pending.delete(target);
    });

  pending.set(target, request);
  return request;
};

if (typeof window !== "undefined") {
  window.addEventListener("userFollowToggled", (e) => {
    const { targetUserId, isFollowing, source } = e.detail || {};
    if (!targetUserId || source === "useFollowing") return;

    const target = String(targetUserId);
    const ids = isFollowing
      ? state.ids.includes(target)
        ? state.ids
        : [...state.ids, target]
      : state.ids.filter((id) => id !== target);

    update({ ids });
  });
}

const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const getSnapshot = () => state;

export const useFollowing = () => {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot);

  useEffect(() => {
    ensureLoaded();
  }, []);

  const isFollowing = useCallback(
    (userId) => userId != null && snapshot.ids.includes(String(userId)),
    [snapshot.ids],
  );

  return {
    followingIds: snapshot.ids,
    isLoaded: snapshot.loaded,
    isFollowing,
    toggleFollow,
  };
};
