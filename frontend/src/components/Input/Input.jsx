import styles from "./Input.module.css";

const Input = ({
  type = "text",
  placeholder,
  value,
  onChange,
  required = false,
}) => {
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      className={styles.input}
      required={required}
    />
  );
};

export default Input;
