import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import API from "../../api/axios";
import styles from "./EditProfilePage.module.css";
import Avatar from "../../components/Avatar/Avatar";

const EditProfilePage = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    username: "",
    website: "",
    bio: "",
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const [dbAvatar, setDbAvatar] = useState("");

  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);

  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [shouldDeleteAvatar, setShouldDeleteAvatar] = useState(false);

  const fileInputRef = useRef(null);

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

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);

      const previewUrl = URL.createObjectURL(file);
      setAvatarPreview(previewUrl);

      setShouldDeleteAvatar(false);
    }
    setIsPhotoModalOpen(false);
  };

  const handleUploadClick = () => {
    fileInputRef.current.click();
    setIsPhotoModalOpen(false);
  };

  const handleRemovePhoto = () => {
    setAvatarFile(null);
    setAvatarPreview(null);
    setDbAvatar("");
    setShouldDeleteAvatar(true);
    setIsPhotoModalOpen(false);
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
              color="rgb(38, 38, 38)"
              fill="rgb(38, 38, 38)"
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
            <div className={styles.avatarWrapper}>
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

          <input
            type="file"
            ref={fileInputRef}
            style={{ display: "none" }}
            accept="image/*"
            onChange={handleFileChange}
          />
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

          <button
            type="submit"
            className={styles.saveButton}
            disabled={loading}
          >
            {loading ? "Saving..." : "Save"}
          </button>
        </form>
      </main>

      {isPhotoModalOpen && (
        <div
          className={styles.modalOverlay}
          onClick={() => setIsPhotoModalOpen(false)}
        >
          <div
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h3>Change profile photo</h3>
            </div>

            <button
              onClick={handleUploadClick}
              className={`${styles.modalAction} ${styles.primary}`}
            >
              Upload photo
            </button>

            {hasCustomAvatar && (
              <button
                onClick={handleRemovePhoto}
                className={`${styles.modalAction} ${styles.danger}`}
              >
                Remove current photo
              </button>
            )}

            <button
              onClick={() => setIsPhotoModalOpen(false)}
              className={styles.modalAction}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditProfilePage;
