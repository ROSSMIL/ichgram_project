import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGuestLoading, setIsGuestLoading] = useState(false);

  const navigate = useNavigate();

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
      });

      if (response.status === 200) {
        localStorage.setItem("token", response.data.token);
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
    setError("");
    try {
      setIsGuestLoading(true);
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
        if (response.data.guestDeviceId) {
          localStorage.setItem("guest_device_id", response.data.guestDeviceId);
        }
        navigate("/dashboard");
      }
    } catch (err) {
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
            isLoading || isGuestLoading ? styles.loadingBox : ""
          }`}
        >
          <Logo />

          <form onSubmit={handleSubmit} className={styles.form} noValidate>
            <Input
              type="text"
              placeholder="Username, or email"
              value={emailOrUsername}
              onChange={handleEmailOrUsernameChange}
              disabled={isLoading || isGuestLoading}
            />

            <div className={styles.inputWrapper}>
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={handlePasswordChange}
                disabled={isLoading || isGuestLoading}
              />
              {password && (
                <button
                  type="button"
                  className={styles.togglePasswordBtn}
                  onClick={() => setShowPassword((prev) => !prev)}
                  tabIndex={-1}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              )}
            </div>

            {error && <div className={styles.errorMessage}>{error}</div>}

            <Button disabled={isLoading || isGuestLoading}>
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
              disabled={isLoading || isGuestLoading}
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

          <LoadingHints active={isLoading || isGuestLoading} />
        </div>

        <div
          className={styles.redirectBox}
          onClick={() => navigate("/register")}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              navigate("/register");
            }
          }}
        >
          <p className={styles.redirectText}>
            Don't have an account? <span className={styles.link}>Sign up</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
