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
    socket.on("join-admin-to-user-room", (room) => {
      socket.join(room);
      console.log(`Admin joined ${room}`);
    });

    // Document submission notification
    socket.on("document-submitted", ({ result }) => {
      console.log("Document submitted by user:", result);
      const room = `${result.userId}`;
      socket.join(room); // User joins their own room
      console.log(`User ${result.userId} submitted a document`);

      io.to(room).emit("new-document-submission", result);
    });

    // Admin sends comment on specific file
    socket.on("admin-comment", ({ userId, docId, comment }) => {
      io.to(`room-user-${userId}`).emit("document-comment", { docId, comment });
    });
    // USER re-uploads document
    socket.on("reUpload", ({ userId, newFile }) => {
      console.log(`🔄 User re-uploaded file in room ${userId}`);
      io.to(userId).emit("reUpload", newFile); // Notify admin
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
