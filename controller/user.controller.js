import { db } from "../db/connection.js";
import { users } from "../db/schema.js";
import { eq } from "drizzle-orm";

export const getAllUsers = async (req, res) => {
  console.log("Fetching all users...");
  try {
    const allUsers = await db
      .select({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        phone: users.phone,
        role: users.role,
        isActive: users.isActive,
        createdAt: users.createdAt,
      })
      .from(users);

    res.json({
      success: true,
      data: allUsers,
      count: allUsers.length,
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch users",
    });
  }
};

export const getUserById = async (req, res) => {
  try {
    const userId = parseInt(req.params.id);

    const user = await db
      .select({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        phone: users.phone,
        role: users.role,
        isActive: users.isActive,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, userId));

    if (user.length === 0) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    res.json({
      success: true,
      data: user[0],
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch user",
    });
  }
};

export const createUser = async (req, res) => {
  try {
    const { email, fullName, phone, role = "user" } = req.body;

    // Basic validation
    if (!email || !fullName) {
      return res.status(400).json({
        success: false,
        error: "Email and full name are required",
      });
    }

    // For now, using a placeholder password hash
    const newUser = await db
      .insert(users)
      .values({
        email,
        fullName,
        phone,
        role,
        passwordHash: "temp_hash_" + Date.now(), // We'll add proper hashing later
      })
      .returning({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        phone: users.phone,
        role: users.role,
        createdAt: users.createdAt,
      });

    res.status(201).json({
      success: true,
      data: newUser[0],
      message: "User created successfully",
    });
  } catch (error) {
    console.error("Error creating user:", error);

    // Handle unique constraint violation
    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        error: "User with this email already exists",
      });
    }

    res.status(500).json({
      success: false,
      error: "Failed to create user",
    });
  }
};

export const updateUser = async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { fullName, phone, role, isActive } = req.body;

    const updatedUser = await db
      .update(users)
      .set({
        fullName,
        phone,
        role,
        isActive,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        phone: users.phone,
        role: users.role,
        isActive: users.isActive,
        updatedAt: users.updatedAt,
      });

    if (updatedUser.length === 0) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    res.json({
      success: true,
      data: updatedUser[0],
      message: "User updated successfully",
    });
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update user",
    });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const userId = parseInt(req.params.id);

    const deletedUser = await db
      .update(users)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        isActive: users.isActive,
      });

    if (deletedUser.length === 0) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    res.json({
      success: true,
      data: deletedUser[0],
      message: "User deactivated successfully",
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({
      success: false,
      error: "Failed to delete user",
    });
  }
};
