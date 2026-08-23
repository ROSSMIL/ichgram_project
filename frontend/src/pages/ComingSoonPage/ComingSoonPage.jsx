import { useNavigate } from "react-router-dom";
import styles from "./ComingSoonPage.module.css";

const ComingSoonPage = ({ title }) => {
  const navigate = useNavigate();

  return (
    <div className={styles.container}>
      <img
        src="https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHJ4ZzJ4ZzJ4ZzJ4ZzJ4ZzJ4ZzJ4ZzJ4ZzJ4ZzJ4ZzJ4ZzJ4JmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1n/l41lTjJp8WhY4GAKk/giphy.gif"
        alt="Coming Soon"
        className={styles.gif}
      />
      <h1>{title}</h1>
      <p>We are working hard on this section!</p>
      <button className={styles.backButton} onClick={() => navigate(-1)}>
        Go Back
      </button>
    </div>
  );
};

export default ComingSoonPage;
