import { useContext } from "react";
import { SocketContext } from "./SocketContextInstance.js";

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    console.warn("useSocket must be used within a SocketProvider");
  }
  return context;
};
