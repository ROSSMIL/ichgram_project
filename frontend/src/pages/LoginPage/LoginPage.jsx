import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { createPortal } from "react-dom";
import API from "../../api/axios.js";
import Input from "../../components/Input/Input.jsx";
import Button from "../../components/Button/Button.jsx";
import LoadingHints from "../../components/LoadingHints/LoadingHints.jsx";
import ThemeToggle from "../../components/ThemeToggle/ThemeToggle.jsx";
import Logo from "../../components/Logo/Logo.jsx";
import styles from "./LoginPage.module.css";

import phonesImg from "../../assets/phones.png";

const LoginPage = () => {
  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [stayLoggedIn, setStayLoggedIn] = useState(() => {
    const saved = localStorage.getItem("rememberMePreference");
    return saved !== null ? saved === "true" : false;
  });

  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGuestLoading, setIsGuestLoading] = useState(false);

  const [showDeletedModal, setShowDeletedModal] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  const isAnyLoading = isLoading || isGuestLoading;

  const handleRememberMeChange = (e) => {
    const checked = e.target.checked;
    setStayLoggedIn(checked);
    localStorage.setItem("rememberMePreference", checked ? "true" : "false");
  };

  useEffect(() => {
    if (location.state?.accountDeleted) {
      const timer = setTimeout(() => {
        setShowDeletedModal(true);
      }, 120);

      return () => clearTimeout(timer);
    }
  }, [location.state]);

  const handleCloseDeletedModal = () => {
    setShowDeletedModal(false);
    navigate("/login", { replace: true, state: {} });
  };

  const handleEmailOrUsernameChange = (e) => {
    setEmailOrUsername(e.target.value);
    if (error) setError("");
  };

  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isAnyLoading) return;
    setError("");

    if (!emailOrUsername.trim() || !password.trim()) {
      setError("Please fill in all fields.");
      return;
    }

    try {
      setIsLoading(true);

      const response = await API.post("/api/auth/login", {
        emailOrUsername: emailOrUsername.trim(),
        password,
        stayLoggedIn,
      });

      if (response.status === 200) {
        localStorage.setItem("token", response.data.token);
        localStorage.setItem("stayLoggedIn", stayLoggedIn ? "true" : "false");
        navigate("/dashboard");
      }
    } catch (err) {
      let serverMessage = "Something went wrong. Please try again.";

      if (err.code === "ECONNABORTED" || !err.response) {
        serverMessage = "Server is warming up. Please try logging in again!";
      } else if (err.response?.data?.message) {
        serverMessage = err.response.data.message;
      }

      setError(serverMessage);
      setPassword("");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    if (isAnyLoading) return;
    setError("");
    try {
      setIsGuestLoading(true);

      localStorage.removeItem("token");

      let guestDeviceId = localStorage.getItem("guest_device_id");
      if (!guestDeviceId) {
        guestDeviceId = crypto.randomUUID
          ? crypto.randomUUID()
          : `device_${Math.random().toString(36).substring(2, 11)}_${Date.now()}`;
        localStorage.setItem("guest_device_id", guestDeviceId);
      }

      const response = await API.post("/api/auth/guest-login", {
        guestDeviceId,
      });

      if (response.status === 200) {
        localStorage.setItem("token", response.data.token);
        localStorage.setItem("stayLoggedIn", "true");
        if (response.data.guestDeviceId) {
          localStorage.setItem("guest_device_id", response.data.guestDeviceId);
        }
        navigate("/dashboard");
      }
    } catch (err) {
      localStorage.removeItem("guest_device_id");

      let serverMessage = "Failed to log in as guest. Please try again.";

      if (err.code === "ECONNABORTED" || !err.response) {
        serverMessage = "Server takes long to wake up. Please click once more!";
      } else if (err.response?.data?.message) {
        serverMessage = err.response.data.message;
      }

      setError(serverMessage);
    } finally {
      setIsGuestLoading(false);
    }
  };

  const handleRedirectToRegister = () => {
    if (!isAnyLoading) {
      navigate("/register");
    }
  };

  return (
    <div className={styles.container}>
      <ThemeToggle />

      <div className={styles.imageSection}>
        <img
          src={phonesImg}
          alt="Ichgram Phones"
          className={styles.phonesImage}
        />
      </div>

      <div className={styles.authSection}>
        <div
          className={`${styles.formBox} ${
            isAnyLoading ? styles.loadingBox : ""
          }`}
        >
          <Logo />

          <form onSubmit={handleSubmit} className={styles.form} noValidate>
            <Input
              type="text"
              placeholder="Username, or email"
              value={emailOrUsername}
              onChange={handleEmailOrUsernameChange}
              disabled={isAnyLoading}
            />

            <div className={styles.inputWrapper}>
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={handlePasswordChange}
                disabled={isAnyLoading}
              />
              {password && (
                <button
                  type="button"
                  className={styles.togglePasswordBtn}
                  onClick={() => setShowPassword((prev) => !prev)}
                  tabIndex={-1}
                  disabled={isAnyLoading}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              )}
            </div>

            <div
              className={`${styles.rememberMeContainer} ${
                isAnyLoading ? styles.rememberDisabled : ""
              }`}
            >
              <label className={styles.rememberMeLabel}>
                <input
                  type="checkbox"
                  checked={stayLoggedIn}
                  onChange={handleRememberMeChange}
                  disabled={isAnyLoading}
                  className={styles.nativeCheckbox}
                />
                <div
                  className={`${styles.customCheckbox} ${
                    stayLoggedIn ? styles.checkboxChecked : ""
                  }`}
                >
                  <svg className={styles.checkboxCheckmark} viewBox="0 0 24 24">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <span className={styles.rememberText}>Remember Me</span>
              </label>
            </div>
            {error && <div className={styles.errorMessage}>{error}</div>}

            <Button disabled={isAnyLoading}>
              {isLoading ? (
                <div className={styles.spinnerWrapper}>
                  <svg className={styles.spinner} viewBox="0 0 50 50">
                    <circle
                      className={styles.path}
                      cx="25"
                      cy="25"
                      r="20"
                      fill="none"
                      strokeWidth="5"
                    ></circle>
                  </svg>
                </div>
              ) : (
                "Log in"
              )}
            </Button>

            <div className={styles.dividerContainer}>
              <div className={styles.dividerLine} />
              <span className={styles.dividerText}>OR</span>
              <div className={styles.dividerLine} />
            </div>

            <button
              type="button"
              className={styles.guestButton}
              onClick={handleGuestLogin}
              disabled={isAnyLoading}
            >
              {isGuestLoading ? (
                <div className={styles.spinnerWrapper}>
                  <svg className={styles.spinner} viewBox="0 0 50 50">
                    <circle
                      className={styles.path}
                      cx="25"
                      cy="25"
                      r="20"
                      fill="none"
                      strokeWidth="5"
                    ></circle>
                  </svg>
                </div>
              ) : (
                "Log in as Guest"
              )}
            </button>
          </form>

          <LoadingHints active={isAnyLoading} />
        </div>

        <div
          className={`${styles.redirectBox} ${
            isAnyLoading ? styles.redirectDisabled : ""
          }`}
          onClick={handleRedirectToRegister}
          role="button"
          tabIndex={isAnyLoading ? -1 : 0}
          onKeyDown={(e) => {
            if ((e.key === "Enter" || e.key === " ") && !isAnyLoading) {
              handleRedirectToRegister();
            }
          }}
        >
          <p className={styles.redirectText}>
            Don&apos;t have an account?{" "}
            <span className={styles.link}>Sign up</span>
          </p>
        </div>
      </div>

      {showDeletedModal &&
        createPortal(
          <div className={styles.modalOverlay}>
            <div
              className={styles.confirmModal}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className={`${styles.modalIconBadge} ${styles.badgeSuccess}`}
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>

              <h3 className={styles.modalTitle}>Account Deleted</h3>

              <p className={styles.modalText}>
                Your account and personal data have been successfully removed.
                <span className={styles.infoBoxText}>
                  We&apos;re sad to see you go! You can create a new account
                  anytime to continue exploring Ichgram.
                </span>
              </p>

              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.saveModalBtn}
                  onClick={handleCloseDeletedModal}
                >
                  Got it
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
};

export default LoginPage;
