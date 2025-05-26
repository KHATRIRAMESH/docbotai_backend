let io;

let adminSocketId = [];

export const initSocket = (serverInstance) => {
  io = serverInstance;

  io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);

    //when the user join the room
    socket.on("join-user-room", ({ userId }) => {
      socket.join(`room-user-${userId}`);
    });

    //when the admin join the room
    socket.on("join-admin-room", ({ userId }) => {
      socket.join(`room-user-${userId}`);
    });

    //when the admin logs in
    socket.on("register-admin", () => {
      adminSocketId.push(socket.id);
      console.log("Admin registered with socket ID:", socket.id);
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
