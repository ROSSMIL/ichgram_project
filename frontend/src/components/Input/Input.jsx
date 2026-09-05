import styles from "./Input.module.css";

const Input = ({
  type = "text",
  placeholder,
  value,
  onChange,
  required = false,
  className = "",
  ...props
}) => {
  return (
    <input
      key={type}
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      className={`${styles.input} ${styles.morphing} ${className}`}
      required={required}
      {...props}
    />
  );
};

export default Input;
