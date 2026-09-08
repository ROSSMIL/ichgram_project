import Sidebar from "../Sidebar/Sidebar.jsx";
import ProfileDropdown from "../ProfileDropdown/ProfileDropdown.jsx";
import styles from "./Layout.module.css";

const Layout = ({ children }) => {
  return (
    <div className={styles.layoutContainer}>
      <Sidebar />
      <ProfileDropdown />
      <main className={styles.mainContent}>{children}</main>
    </div>
  );
};

export default Layout;
