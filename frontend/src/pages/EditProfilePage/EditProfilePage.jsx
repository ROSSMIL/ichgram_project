import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API from "../../api/axios";
import styles from "./EditProfilePage.module.css";
import Avatar from "../../components/Avatar/Avatar";
import AvatarViewModal from "../../components/AvatarViewModal/AvatarViewModal";

const SEEDED_USERNAMES = [
  "itcareerhub",
  "coach.tonia",
  "fsssociety",
  "pixel_architect",
  "gamer_pro",
  "nature_wild",
  "foodie_travel",
  "sound_wave",
  "cyber_ninja",
  "volley_king",
];

const EditProfilePage = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    username: "",
    website: "",
    bio: "",
  });

  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const [dbAvatar, setDbAvatar] = useState("");
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);

  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [shouldDeleteAvatar, setShouldDeleteAvatar] = useState(false);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const currentUsernameLower = (formData.username || "").toLowerCase();
  const isGuest = currentUsernameLower === "guest_user";
  const isSeeded = SEEDED_USERNAMES.includes(currentUsernameLower);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return navigate("/login");

        const { data } = await API.get("/api/users/profile", {
          headers: { Authorization: `Bearer ${token}` },
        });

        setFormData({
          username: data.username || "",
          website: data.website || "",
          bio: data.bio || "",
        });

        setDbAvatar(data.avatar || "");
      } catch (error) {
        console.error("Error fetching profile", error);
      }
    };

    fetchProfile();
  }, [navigate]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleModalUpload = (file) => {
    setAvatarFile(file);
    const previewUrl = URL.createObjectURL(file);
    setAvatarPreview(previewUrl);
    setShouldDeleteAvatar(false);
  };

  const handleModalRemove = () => {
    setAvatarFile(null);
    setAvatarPreview(null);
    setDbAvatar("");
    setShouldDeleteAvatar(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const token = localStorage.getItem("token");

      const dataToSend = new FormData();
      dataToSend.append("username", formData.username);
      dataToSend.append("website", formData.website);
      dataToSend.append("bio", formData.bio);

      if (avatarFile) {
        dataToSend.append("avatar", avatarFile);
      }

      if (shouldDeleteAvatar) {
        dataToSend.append("deleteAvatar", "true");
      }

      await API.put("/api/users/edit", dataToSend, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setMessage({ type: "success", text: "Profile updated successfully!" });

      window.dispatchEvent(new Event("profileUpdated"));

      setTimeout(() => navigate("/profile"), 1200);
    } catch (error) {
      setMessage({
        type: "error",
        text: error.response?.data?.message || "Failed to update profile",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    setDeleteLoading(true);
    try {
      const token = localStorage.getItem("token");
      const { data } = await API.delete("/api/users/profile", {
        headers: { Authorization: `Bearer ${token}` },
      });

      localStorage.removeItem("token");
      window.dispatchEvent(new Event("profileUpdated"));

      if (data.isGuestReset || data.isSeededReset) {
        console.log("Demo profile reset successfully!");
      }

      navigate("/login");
    } catch (error) {
      console.error("Delete account error:", error);
      setMessage({
        type: "error",
        text: error.response?.data?.message || "Failed to process request",
      });
      setIsDeleteModalOpen(false);
    } finally {
      setDeleteLoading(false);
    }
  };

  const getAvatarUrl = () => {
    if (avatarPreview) return avatarPreview;
    if (dbAvatar) {
      return dbAvatar.startsWith("http")
        ? dbAvatar
        : `${API.defaults.baseURL}/${dbAvatar.replace(/^\//, "")}`;
    }
    return "";
  };

  const avatarUser = {
    username: formData.username,
    avatar: getAvatarUrl(),
  };

  const hasCustomAvatar = !!(dbAvatar || avatarPreview);

  return (
    <div className={styles.editProfileContainer}>
      <main className={styles.mainContent}>
        <div className={styles.headerRow}>
          <button
            type="button"
            className={styles.backBtn}
            onClick={() => navigate("/profile")}
            aria-label="Back to profile"
          >
            <svg
              aria-label="Back"
              color="currentColor"
              fill="currentColor"
              height="24"
              role="img"
              viewBox="0 0 24 24"
              width="24"
            >
              <line
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                x1="2.909"
                x2="21.413"
                y1="12"
                y2="12"
              ></line>
              <polyline
                fill="none"
                points="11.692 3.22 2.909 12 11.692 20.78"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
              ></polyline>
            </svg>
          </button>
          <h2 className={styles.pageTitle}>Edit profile</h2>
          <div className={styles.headerSpacer} />
        </div>

        <div className={styles.profileBanner}>
          <div className={styles.bannerLeft}>
            <div
              className={styles.avatarWrapper}
              onClick={() => setIsPhotoModalOpen(true)}
              style={{ cursor: "pointer" }}
            >
              <Avatar user={avatarUser} size={48} />
            </div>

            <div className={styles.bannerInfo}>
              <span className={styles.bannerUsername}>
                {formData.username || "Loading..."}
              </span>
              <p className={styles.bannerSubtext}>
                {formData.bio || "No bio yet."}
              </p>
            </div>
          </div>

          <button
            type="button"
            className={styles.newPhotoBtn}
            onClick={() => setIsPhotoModalOpen(true)}
          >
            Change photo
          </button>
        </div>

        <form onSubmit={handleSave} className={styles.editForm}>
          <div className={styles.inputGroup}>
            <label className={styles.label}>Username</label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              className={styles.input}
              required
            />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>Website</label>
            <input
              type="text"
              name="website"
              value={formData.website}
              onChange={handleChange}
              className={styles.input}
            />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>About</label>
            <div className={styles.textareaWrapper}>
              <textarea
                name="bio"
                value={formData.bio}
                onChange={handleChange}
                className={styles.textarea}
                maxLength={150}
              />
              <span className={styles.charCounter}>
                {(formData.bio || "").length} / 150
              </span>
            </div>
          </div>

          {message && (
            <p
              className={
                message.type === "success" ? styles.successMsg : styles.errorMsg
              }
            >
              {message.text}
            </p>
          )}

          <div className={styles.actionButtonsRow}>
            <button
              type="submit"
              className={styles.saveButton}
              disabled={loading}
            >
              {loading ? "Saving..." : "Save"}
            </button>

            <button
              type="button"
              className={styles.deleteAccountBtn}
              onClick={() => setIsDeleteModalOpen(true)}
            >
              {isGuest || isSeeded ? "Reset account" : "Delete account"}
            </button>
          </div>
        </form>
      </main>

      {isPhotoModalOpen && (
        <AvatarViewModal
          user={avatarUser}
          isOwnProfile={true}
          hasCustomAvatar={hasCustomAvatar}
          onClose={() => setIsPhotoModalOpen(false)}
          onUploadSave={handleModalUpload}
          onRemovePhoto={handleModalRemove}
        />
      )}

      {isDeleteModalOpen && (
        <div
          className={styles.modalOverlay}
          onClick={() => setIsDeleteModalOpen(false)}
        >
          <div
            className={styles.confirmModal}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={`${styles.modalIconBadge} ${
                isGuest || isSeeded ? styles.badgeSeeded : styles.badgeDanger
              }`}
            >
              {isGuest || isSeeded ? (
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                  <path d="M3 3v5h5" />
                  <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                  <path d="M16 21h5v-5" />
                </svg>
              ) : (
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              )}
            </div>

            <h3 className={styles.modalTitle}>
              {isGuest
                ? "Reset Guest Account?"
                : isSeeded
                  ? "Reset Seed Account?"
                  : "Delete Account?"}
            </h3>

            <p className={styles.modalText}>
              {isGuest ? (
                <>
                  Are you sure you want to reset the Guest account?
                  <br />
                  <span className={styles.easterEggText}>
                    <strong>Fun fact:</strong> Guest accounts are immortal!
                    Triggering a reset will clear session changes and restore it
                    back to factory defaults.
                  </span>
                </>
              ) : isSeeded ? (
                <>
                  Are you sure you want to reset this profile?
                  <br />
                  <span className={styles.easterEggText}>
                    <strong>Fun fact:</strong> It's nice to see you here! (You
                    actually found the password? *cough*)... But demo accounts
                    are immortal as well! Triggering a reset will clear session
                    changes and restore it back to factory defaults.
                  </span>
                </>
              ) : (
                "Are you sure you want to delete your account? All your posts, comments, likes, and profile data will be permanently removed. This action cannot be undone."
              )}
            </p>

            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.cancelModalBtn}
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={deleteLoading}
              >
                Cancel
              </button>

              <button
                type="button"
                className={styles.confirmDeleteBtn}
                onClick={handleDeleteConfirm}
                disabled={deleteLoading}
              >
                {deleteLoading
                  ? "Processing..."
                  : isGuest || isSeeded
                    ? "Reset & Wipe"
                    : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditProfilePage;
