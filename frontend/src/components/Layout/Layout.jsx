import Sidebar from "../Sidebar/Sidebar.jsx";

import ProfileDropdown from "../ProfileDropdown/ProfileDropdown.jsx";

import ActivityWidget from "../ActivityWidget/ActivityWidget.jsx";

import ScrollToTopButton from "../ScrollToTopButton/ScrollToTopButton.jsx"; 

import styles from "./Layout.module.css";

const Layout = ({ children, ...sidebarProps }) => {
  return (
    <div className={styles.layoutContainer}>
      <aside className={styles.leftSidebarContainer}>
        <Sidebar {...sidebarProps} />

        <ActivityWidget />
      </aside>

      <ProfileDropdown />

      <main className={styles.mainContent}>{children}</main>


      <ScrollToTopButton />
    </div>
  );
};

export default Layout;
