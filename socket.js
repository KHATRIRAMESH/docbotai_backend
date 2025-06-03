import { eq } from "drizzle-orm";
import { db } from "./db/connection.js";
import { notifications } from "./db/schema.js";


let io;

let adminSocketId = [];

export const initSocket = (serverInstance) => {
  io = serverInstance;

  io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);

    // User joins their private room after submitting
    socket.on("join-user-room", ({ userId }) => {
      // console.log(`User ${userId} joining their room`);
      const room = `room-user-${userId}`;
      socket.join(room);
      // console.log(`User ${userId} joined ${room}`);
    });

    // Admin joins a user's room when clicking notification
    socket.on("join-admin-room", () => {
      socket.join("admins");
      console.log("An admin joined the admins room");
    });

    // Document submission notification
    socket.on("document-submitted", ({ result }) => {
      console.log("Document submitted by user:", result);

      console.log(`User ${result.userId} submitted a document`);
      // io.to("admins").emit("new-document-submission", {
      //   userId: result.userId,
      //   loanType: result.loanType,
      //   fullName: result.fullName,
      //   permanentAddress: result.permanentAddress,
      //   currentAddress: result.currentAddress,
      //   files: result.files,
      // });
    });

    socket.on("mark-notification-read", async ({ notificationId }) => {
      try {
        await db
          .update(notifications)
          .set({ isRead: true })
          .where(eq(notifications.id, notificationId));
        console.log(`Notification ${notificationId} marked as read`);
        socket.emit("notification-read-updated", { notificationId });
      } catch (error) {
        console.error("Error marking notification as read:", error);
      }
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
