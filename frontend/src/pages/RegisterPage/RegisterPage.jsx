import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../../api/axios.js";
import Input from "../../components/Input/Input.jsx";
import Button from "../../components/Button/Button.jsx";
import styles from "./RegisterPage.module.css";
import logoImg from "../../assets/logo.png";

const RegisterPage = () => {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (
      !email.trim() ||
      !fullName.trim() ||
      !username.trim() ||
      !password.trim()
    ) {
      setError("All fields are required.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    try {
      const response = await API.post("/api/auth/register", {
        email,
        fullName,
        username,
        password,
      });

      if (response.status === 201 || response.status === 200) {
        console.log("Register successful!");
        navigate("/login");
      }
    } catch (err) {
      const serverMessage =
        err.response?.data?.message ||
        "Something went wrong. Please try again.";
      setError(serverMessage);
      setPassword("");
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.authSection}>
        <div className={styles.formBox}>
          <img src={logoImg} alt="ICHGRAM" className={styles.logoImage} />

          <p className={styles.subtitle}>
            Sign up to see photos and videos from your friends.
          </p>

          <form onSubmit={handleSubmit} className={styles.form} noValidate>
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {error.toLowerCase().includes("email") && (
              <div className={styles.errorMessage}>{error}</div>
            )}

            <Input
              type="text"
              placeholder="Full Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />

            <Input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            {error.toLowerCase().includes("username") && (
              <div className={styles.errorMessage}>{error}</div>
            )}

            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

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

            <p className={styles.policyText}>
              People who use our service may have uploaded your contact
              information to Instagram. <a href="#learnmore">Learn More</a>
              <br />
              <br />
              By signing up, you agree to our <a href="#terms">Terms</a>,{" "}
              <a href="#privacy">Privacy Policy</a> and{" "}
              <a href="#cookies">Cookies Policy</a>.
            </p>

            <Button>Sign up</Button>
          </form>
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
