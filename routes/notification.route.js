import express from "express";
import {
  deleteNotification,
  getAllNotification,
  markNotificationAsRead,
} from "../controller/notification.controller.js";

const router = express.Router();

router.get("/", getAllNotification);
router.patch("/:id", markNotificationAsRead);

router.delete("/:id", deleteNotification);

export default router;
