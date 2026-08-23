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
        console.log("Login successful!", response.data);
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
        <div className={styles.formBox}>
          <img src={logoImg} alt="ICHGRAM" className={styles.logoImage} />

          <form onSubmit={handleSubmit} className={styles.form} noValidate>
            <Input
              type="text"
              placeholder="Username, or email"
              value={emailOrUsername}
              onChange={(e) => setEmailOrUsername(e.target.value)}
              disabled={isLoading}
            />
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
            />

            {error && <div className={styles.errorMessage}>{error}</div>}

            <Button disabled={isLoading}>
              {isLoading ? "Logging in..." : "Log in"}
            </Button>
          </form>

          <div className={styles.dividerContainer}>
            <div className={styles.dividerLine}></div>
            <span className={styles.dividerText}>OR</span>
            <div className={styles.dividerLine}></div>
          </div>

          <a href="#forgot" className={styles.forgotPassword}>
            Forgot password?
          </a>
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
