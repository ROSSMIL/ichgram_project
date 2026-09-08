import { useNavigate } from "react-router-dom";
import styles from "./PageHeader.module.css";

const PageHeader = ({ title, backTo }) => {
  const navigate = useNavigate();

  const handleBackClick = () => {
    if (backTo) {
      navigate(backTo);
    } else {
      navigate(-1);
    }
  };

  return (
    <div className={styles.topHeaderContainer}>
      <button
        type="button"
        className={styles.backPillBtn}
        onClick={handleBackClick}
        aria-label="Back"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="15 18 9 12 15 6" />
        </svg>
        <span>Back</span>
      </button>

      {title && <h1 className={styles.pageTitle}>{title}</h1>}
    </div>
  );
};

export default PageHeader;
