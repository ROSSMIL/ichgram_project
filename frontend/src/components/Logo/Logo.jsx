import { useRef, useState } from "react";
import styles from "./Logo.module.css";

const Logo = ({ className = "", onClick, size = "large" }) => {
  const brandName = "ICHGRAM";
  const logoRef = useRef(null);
  const glowRef = useRef(null);
  const [isPressed, setIsPressed] = useState(false);

  const handleMouseMove = (e) => {
    if (!logoRef.current || !glowRef.current) return;

    const rect = logoRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    glowRef.current.style.setProperty("--mouse-x", `${x}px`);
    glowRef.current.style.setProperty("--mouse-y", `${y}px`);
  };

  const handleMouseLeave = () => {
    setIsPressed(false);
    if (!glowRef.current || !logoRef.current) return;
    const rect = logoRef.current.getBoundingClientRect();

    glowRef.current.style.setProperty("--mouse-x", `${rect.width / 2}px`);
    glowRef.current.style.setProperty("--mouse-y", `${rect.height / 2}px`);
  };

  return (
    <div
      ref={logoRef}
      className={`${styles.logoWrapper} ${styles[size]} ${
        onClick ? styles.clickable : ""
      } ${isPressed ? styles.pressed : ""} ${className}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onMouseDown={() => onClick && setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onClick={onClick}
      role={onClick ? "button" : "presentation"}
      tabIndex={onClick ? 0 : -1}
      onKeyDown={(e) => {
        if (onClick && (e.key === "Enter" || e.key === " ")) {
          onClick(e);
        }
      }}
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
