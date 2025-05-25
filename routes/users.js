import express from "express";

import {
  createUser,
  deleteUser,
  getAllUsers,
  getUserById,
  updateUser,
} from "../controller/user.controller.js";

const router = express.Router();

// Get all users
router.get("/", getAllUsers);

// Get user by ID
router.get("/:id", getUserById);

// Create new user (basic - without password hashing for now)
router.post("/", createUser);

// Update user
router.put("/:id", updateUser);

// Delete user (soft delete - set isActive to false)
router.delete("/:id", deleteUser);

export default router;
