let io;

let adminSocketId = [];

export const initSocket = (serverInstance) => {
  io = serverInstance;

  io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);

    // User joins their private room after submitting
    socket.on("join-user-room", ({ userId }) => {
      console.log(`User ${userId} joining their room`);
      const room = `room-user-${userId}`;
      socket.join(room);
      console.log(`User ${userId} joined ${room}`);
    });

    // Admin joins a user's room when clicking notification
    socket.on("join-admin-to-user-room", ({ userId }) => {
      const room = `room-user-${userId}`;
      socket.join(room);
      console.log(`Admin joined ${room}`);
    });

    // Document submission notification
    socket.on("document-submitted", (payload) => {
      const room = `room-user-${payload.userId}`;
      socket.join(room); // User joins their own room

      io.to("admin-room").emit("new-document-submission", payload);
    });

    // Admin sends comment on specific file
    socket.on("admin-comment", ({ userId, docId, comment }) => {
      io.to(`room-user-${userId}`).emit("document-comment", { docId, comment });
    });

    //when any of the user is disconnected
    socket.on("disconnect", () => {
      console.log("Socket disconnected:", socket.id);
    });
  });
};

export const getIO = () => {
  if (!io) {
    throw new Error("Socket.io not initialized");
  }
  return io;
};
