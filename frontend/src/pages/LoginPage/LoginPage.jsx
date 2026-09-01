import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../../api/axios.js";
import Input from "../../components/Input/Input.jsx";
import Button from "../../components/Button/Button.jsx";
import styles from "./LoginPage.module.css";

import phonesImg from "../../assets/phones.png";
import logoImg from "../../assets/logo.png";

const LoginPage = () => {
  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGuestLoading, setIsGuestLoading] = useState(false);

  const navigate = useNavigate();

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
      const serverMessage =
        err.response?.data?.message ||
        "Something went wrong. Please try again.";
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

      const response = await API.post("/api/auth/guest-login");

      if (response.status === 200) {
        localStorage.setItem("token", response.data.token);
        navigate("/dashboard");
      }
    } catch (err) {
      const serverMessage =
        err.response?.data?.message ||
        "Failed to log in as guest. Please try again.";
      setError(serverMessage);
    } finally {
      setIsGuestLoading(false);
    }
  };

  return (
    <div className={styles.container}>
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
          <img src={logoImg} alt="ICHGRAM" className={styles.logoImage} />

          <form onSubmit={handleSubmit} className={styles.form} noValidate>
            <Input
              type="text"
              placeholder="Username, or email"
              value={emailOrUsername}
              onChange={(e) => setEmailOrUsername(e.target.value)}
              disabled={isLoading || isGuestLoading}
            />
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading || isGuestLoading}
            />

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
        </div>

        <div className={styles.redirectBox}>
          <p className={styles.redirectText}>
            Don't have an account?{" "}
            <Link to="/register" className={styles.link}>
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
