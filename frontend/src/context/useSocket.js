import { useContext } from "react";
import { SocketContext } from "./SocketContextInstance.js";

export const useSocket = () => {
  return useContext(SocketContext);
};
