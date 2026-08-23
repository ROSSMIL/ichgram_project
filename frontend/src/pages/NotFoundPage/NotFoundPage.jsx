import phonesImg from "../../assets/phones.png";
import styles from "./NotFoundPage.module.css";

const NotFoundPage = () => {
  return (
    <div className={styles.container}>
      <div className={styles.contentWrapper}>
        <div className={styles.imageContainer}>
          <img
            src={phonesImg}
            alt="Page not found"
            className={styles.phonesImage}
          />
        </div>

        <div className={styles.textContainer}>
          <h1 className={styles.title}>Oops! Page Not Found (404 Error)</h1>
          <p className={styles.description}>
            We're sorry, but the page you're looking for doesn't seem to exist.
            If you typed the URL manually, please double-check the spelling. If
            you clicked on a link, it may be outdated or broken.
          </p>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;
