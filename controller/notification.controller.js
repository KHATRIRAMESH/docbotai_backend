import { db } from "../db/connection.js";
import { notifications } from "../db/schema.js";

export const getAllNotification = async (req, res) => {
  try {
    const fetchNotifications = await db.select().from(notifications);

    if (fetchNotifications.length === 0) {
      return res.status(404).json({
        success: false,
        error: "No notifications found",
      });
    }

    return res.status(200).json({
      success: true,
      data: fetchNotifications,
      count: fetchNotifications.length,
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to fetch notifications",
    });
  }
};

export const markNotificationAsRead = async (req, res) => {
  try {
    const notificationId = req.params.id;

    const updatedNotification = await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, notificationId))
      .returning();

    if (updatedNotification.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Notification not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: updatedNotification[0],
    });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to mark notification as read",
    });
  }
};

export const deleteNotification = async (req, res) => {
  try {
    const notificationId = req.params.id;

    const deletedNotification = await db
      .delete(notifications)
      .where(eq(notifications.id, notificationId))
      .returning();

    if (deletedNotification.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Notification not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: deletedNotification[0],
    });
  } catch (error) {
    console.error("Error deleting notification:", error);
    res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to delete notification",
    });
  }
};
