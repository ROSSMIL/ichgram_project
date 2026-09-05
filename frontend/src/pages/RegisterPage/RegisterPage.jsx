import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../../api/axios.js";
import Input from "../../components/Input/Input.jsx";
import Button from "../../components/Button/Button.jsx";
import LoadingHints from "../../components/LoadingHints/LoadingHints.jsx";
import ThemeToggle from "../../components/ThemeToggle/ThemeToggle.jsx";
import styles from "./RegisterPage.module.css";
import logoImg from "../../assets/logo.png";

const RegisterPage = () => {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();


  const isMinLength = password.length >= 6;
  const isMatching = password.length > 0 && password === confirmPassword;

  const handlePasswordChange = (e) => {
    const val = e.target.value;
    setPassword(val);
    if (!val && !confirmPassword) {
      setShowPasswords(false);
    }
  };

  const handleConfirmPasswordChange = (e) => {
    const val = e.target.value;
    setConfirmPassword(val);
    if (!val && !password) {
      setShowPasswords(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (
      !email.trim() ||
      !fullName.trim() ||
      !username.trim() ||
      !password.trim() ||
      !confirmPassword.trim()
    ) {
      setError("All fields are required.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setIsLoading(true);
      const response = await API.post("/api/auth/register", {
        email: email.trim(),
        fullName: fullName.trim(),
        username: username.trim(),
        password,
      });

      if (response.status === 201 || response.status === 200) {
        if (response.data?.token) {
          localStorage.setItem("token", response.data.token);
          navigate("/dashboard");
        } else {
          navigate("/login");
        }
      }
    } catch (err) {
      const serverMessage =
        err.response?.data?.message ||
        "Something went wrong. Please try again.";
      setError(serverMessage);
      setPassword("");
      setConfirmPassword("");
      setShowPasswords(false);
    } finally {
      setIsLoading(false);
    }
  };

  const hasPasswordInput = password.length > 0 || confirmPassword.length > 0;

  const passwordType =
    showPasswords && password.length > 0 ? "text" : "password";

  const confirmPasswordType =
    showPasswords && confirmPassword.length > 0 ? "text" : "password";

  return (
    <div className={styles.container}>
      <ThemeToggle />

      <div className={styles.authSection}>
        <div
          className={`${styles.formBox} ${isLoading ? styles.loadingBox : ""}`}
        >
          <img src={logoImg} alt="ICHGRAM" className={styles.logoImage} />

          <form onSubmit={handleSubmit} className={styles.form} noValidate>
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
            />

            {error.toLowerCase().includes("email") && (
              <div className={styles.errorMessage}>{error}</div>
            )}

            <Input
              type="text"
              placeholder="Full Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={isLoading}
            />

            <Input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isLoading}
            />

            {error.toLowerCase().includes("username") && (
              <div className={styles.errorMessage}>{error}</div>
            )}

            <Input
              type={passwordType}
              placeholder="Password"
              value={password}
              onChange={handlePasswordChange}
              disabled={isLoading}
              className={`${styles.passwordInput} ${
                showPasswords && password.length > 0 ? styles.reveal : ""
              }`}
            />

            <Input
              type={confirmPasswordType}
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={handleConfirmPasswordChange}
              disabled={isLoading}
              className={`${styles.passwordInput} ${
                showPasswords && confirmPassword.length > 0 ? styles.reveal : ""
              }`}
            />


            {hasPasswordInput && (
              <div className={styles.showPasswordsWrapper}>
                <button
                  type="button"
                  className={styles.togglePasswordsBtn}
                  onClick={() => setShowPasswords((prev) => !prev)}
                  tabIndex={-1}
                >
                  {showPasswords ? "Hide passwords" : "Show passwords"}
                </button>
              </div>
            )}


            {hasPasswordInput && (
              <div className={styles.passwordRulesContainer}>
                <div className={styles.rulesList}>
                  <div
                    className={`${styles.ruleItem} ${
                      isMinLength ? styles.ruleSuccess : ""
                    }`}
                  >
                    <span className={styles.ruleIcon}>
                      {isMinLength ? "✓" : "○"}
                    </span>
                    <span>At least 6 characters</span>
                  </div>

                  <div
                    className={`${styles.ruleItem} ${
                      isMatching ? styles.ruleSuccess : ""
                    }`}
                  >
                    <span className={styles.ruleIcon}>
                      {isMatching ? "✓" : "○"}
                    </span>
                    <span>Passwords match</span>
                  </div>
                </div>
              </div>
            )}

            {error &&
              !error.toLowerCase().includes("email") &&
              !error.toLowerCase().includes("username") && (
                <div
                  className={styles.errorMessage}
                  style={{ alignSelf: "center", textAlign: "center" }}
                >
                  {error}
                </div>
              )}

            <Button disabled={isLoading}>
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
                "Sign up"
              )}
            </Button>
          </form>

          <LoadingHints active={isLoading} />
        </div>

        <div className={styles.redirectBox}>
          <p className={styles.redirectText}>
            Have an account?{" "}
            <Link to="/login" className={styles.link}>
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;