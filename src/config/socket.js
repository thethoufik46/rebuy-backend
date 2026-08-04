import { Server } from "socket.io";

let io;

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log("🟢 Socket:", socket.id);

    socket.on("join", (userId) => {
      socket.join(userId);
    });

    socket.on("join-admin", () => {
      socket.join("admin");
    });

    socket.on("disconnect", () => {
      console.log("🔴 Disconnect");
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) throw new Error("Socket.IO not initialized");
  return io;
};