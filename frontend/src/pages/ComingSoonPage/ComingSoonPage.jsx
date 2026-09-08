import { useNavigate } from "react-router-dom";
import PageHeader from "../../components/PageHeader/PageHeader";
import styles from "./ComingSoonPage.module.css";

const ComingSoonPage = ({ title = "Coming Soon" }) => {
  const navigate = useNavigate();

  const handleGoHome = () => {
    navigate("/dashboard");
  };

  return (
    <div className={styles.container}>
      <PageHeader backTo="/dashboard" />

      <div className={styles.mainContent}>
        <img
          src="https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHJ4ZzJ4ZzJ4ZzJ4ZzJ4ZzJ4ZzJ4ZzJ4ZzJ4ZzJ4ZzJ4ZzJ4JmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1n/l41lTjJp8WhY4GAKk/giphy.gif"
          alt="Coming Soon"
          className={styles.gif}
        />
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.subtitle}>We are working hard on this section!</p>

        <button className={styles.backButton} onClick={handleGoHome}>
          Back to Dashboard
        </button>
      </div>
    </div>
  );
};

export default ComingSoonPage;
