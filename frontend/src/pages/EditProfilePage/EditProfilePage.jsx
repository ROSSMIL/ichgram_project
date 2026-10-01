import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import API from "../../api/axios";
import styles from "./EditProfilePage.module.css";
import Avatar from "../../components/Avatar/Avatar";
import AvatarViewModal from "../../components/AvatarViewModal/AvatarViewModal";

const SEEDED_EMAILS = [
  "hub@itcareer.com",
  "tonia@example.com",
  "society@example.com",
  "pixel@example.com",
  "gamer@example.com",
  "nature@example.com",
  "food@example.com",
  "sound@example.com",
  "ninja@example.com",
  "volley@example.com",
];

const SEEDED_USERNAMES = [
  "itcareerhub",
  "tonia_art",
  "society_vibe",
  "pixel_master",
  "gamer_pro",
  "nature_lover",
  "foodie_joy",
  "sound_wave",
  "ninja_code",
  "volley_star",
];

const EditProfilePage = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    username: "",
    fullName: "",
    website: "",
    bio: "",
    email: "",
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
  const [isDeleteModalClosing, setIsDeleteModalClosing] = useState(false);

  const isSeeded = Boolean(
    SEEDED_EMAILS.includes((formData.email || "").toLowerCase()) ||
    SEEDED_USERNAMES.includes((formData.username || "").toLowerCase()),
  );

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return navigate("/login");

        const { data } = await API.get("/api/users/profile");

        setFormData({
          username: data.username || "",
          fullName: data.fullName || "",
          website: data.website || "",
          bio: data.bio || "",
          email: data.email || "",
        });

        if (data.avatar) {
          setDbAvatar(data.avatar);
        }
      } catch (error) {
        console.error("Error fetching profile", error);
      }
    };

    fetchProfile();
  }, [navigate]);

  const handleCloseDeleteModal = useCallback(() => {
    if (isDeleteModalClosing) return;
    setIsDeleteModalClosing(true);
    setTimeout(() => {
      setIsDeleteModalOpen(false);
      setIsDeleteModalClosing(false);
    }, 200);
  }, [isDeleteModalClosing]);

  useEffect(() => {
    if (!isDeleteModalOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        handleCloseDeleteModal();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isDeleteModalOpen, handleCloseDeleteModal]);

  const handleChange = (e) => {
    if (isSeeded) return;
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleModalUpload = (file) => {
    if (isSeeded) return;
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setMessage({
        type: "error",
        text: "Selected image is too large (max 10MB). Please select a smaller photo.",
      });
      return;
    }

    setAvatarFile(file);
    const previewUrl = URL.createObjectURL(file);
    setAvatarPreview(previewUrl);
    setShouldDeleteAvatar(false);
    setMessage(null);
  };

  const handleModalRemove = () => {
    if (isSeeded) return;
    setAvatarFile(null);
    setAvatarPreview(null);
    setDbAvatar("");
    setShouldDeleteAvatar(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (isSeeded) return;

    setLoading(true);
    setMessage(null);

    try {
      const token = localStorage.getItem("token");

      const dataToSend = new FormData();
      dataToSend.append("username", formData.username);
      dataToSend.append("fullName", formData.fullName);
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
          "Content-Type": "multipart/form-data",
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
    if (isSeeded) return;

    setDeleteLoading(true);
    try {
      const token = localStorage.getItem("token");
      await API.delete("/api/users/profile", {
        headers: { Authorization: `Bearer ${token}` },
      });

      localStorage.removeItem("token");
      localStorage.removeItem("guest_device_id");

      window.dispatchEvent(new CustomEvent("auth:logout"));
      window.dispatchEvent(new Event("profileUpdated"));

      navigate("/login");
    } catch (error) {
      console.error("Delete account error:", error);
      setMessage({
        type: "error",
        text: error.response?.data?.message || "Failed to process request",
      });
      handleCloseDeleteModal();
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
              onClick={() => !isSeeded && setIsPhotoModalOpen(true)}
              style={{ cursor: isSeeded ? "not-allowed" : "pointer" }}
            >
              <Avatar user={avatarUser} size={48} showStatus={false} />
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

          {!isSeeded && (
            <button
              type="button"
              className={styles.newPhotoBtn}
              onClick={() => setIsPhotoModalOpen(true)}
            >
              Change photo
            </button>
          )}
        </div>

        <form onSubmit={handleSave} className={styles.editForm}>
          <div className={styles.inputGroup}>
            <label className={styles.label}>Name</label>
            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              className={styles.input}
              placeholder="Full Name"
              disabled={isSeeded}
            />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>Username</label>
            <div className={styles.disabledInputWrapper}>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                className={styles.input}
                disabled={isSeeded}
                required
              />
            </div>
            {isSeeded && (
              <p
                className={styles.disabledHint}
                data-hover="...no seriously, stop hovering, it won't unlock!"
              >
                <svg
                  className={styles.lockIcon}
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <span>
                  Demo usernames are locked to keep the universe stable.
                </span>
              </p>
            )}
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>Website</label>
            <input
              type="text"
              name="website"
              value={formData.website}
              onChange={handleChange}
              className={styles.input}
              placeholder="https://yourwebsite.com"
              disabled={isSeeded}
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
                placeholder="Write a short bio..."
                disabled={isSeeded}
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

          {!isSeeded && (
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
                Delete account
              </button>
            </div>
          )}
        </form>
      </main>

      {isPhotoModalOpen && !isSeeded && (
        <AvatarViewModal
          user={avatarUser}
          isOwnProfile={true}
          hasCustomAvatar={hasCustomAvatar}
          onClose={() => setIsPhotoModalOpen(false)}
          onUploadSave={handleModalUpload}
          onRemovePhoto={handleModalRemove}
        />
      )}

      {isDeleteModalOpen &&
        !isSeeded &&
        createPortal(
          <div
            className={`${styles.modalOverlay} ${
              isDeleteModalClosing ? styles.modalOverlayClosing : ""
            }`}
            onClick={handleCloseDeleteModal}
          >
            <div
              className={`${styles.confirmModal} ${
                isDeleteModalClosing ? styles.modalContentClosing : ""
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={`${styles.modalIconBadge} ${styles.badgeDanger}`}>
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
              </div>

              <h3 className={styles.modalTitle}>Delete Account?</h3>

              <p className={styles.modalText}>
                Are you sure you want to delete your account?
                <span className={styles.warningBoxText}>
                  <strong>Warning:</strong> All your posts, comments, likes, and
                  profile data will be permanently removed. This action cannot
                  be undone.
                </span>
              </p>

              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.cancelModalBtn}
                  onClick={handleCloseDeleteModal}
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
                  {deleteLoading ? "Processing..." : "Delete"}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
};

export default EditProfilePage;
