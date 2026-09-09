import { useRef } from "react";
import styles from "./Logo.module.css";

const Logo = ({ className = "" }) => {
  const brandName = "ICHGRAM";
  const logoRef = useRef(null);
  const glowRef = useRef(null);

  const handleMouseMove = (e) => {
    if (!logoRef.current || !glowRef.current) return;

    const rect = logoRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    glowRef.current.style.setProperty("--mouse-x", `${x}px`);
    glowRef.current.style.setProperty("--mouse-y", `${y}px`);
  };

  const handleMouseLeave = () => {
    if (!glowRef.current || !logoRef.current) return;
    const rect = logoRef.current.getBoundingClientRect();

    glowRef.current.style.setProperty("--mouse-x", `${rect.width / 2}px`);
    glowRef.current.style.setProperty("--mouse-y", `${rect.height / 2}px`);
  };

  return (
    <div
      ref={logoRef}
      className={`${styles.logoWrapper} ${className}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div ref={glowRef} className={styles.ambientGlow} />

      <h1 className={styles.animatedLogo}>
        {brandName.split("").map((char, index) => (
          <span
            key={index}
            className={styles.char}
            style={{ animationDelay: `${index * 0.12}s` }}
          >
            {char}
          </span>
        ))}
      </h1>
    </div>
  );
};

export default Logo;
