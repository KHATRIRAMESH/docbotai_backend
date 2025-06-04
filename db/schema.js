import {
  pgTable,
  serial,
  varchar,
  text,
  timestamp,
  boolean,
  decimal,
  integer,
  jsonb,
  uuid,
  pgEnum,
} from "drizzle-orm/pg-core";

export const statusEnum = pgEnum("status", [
  "pending",
  "under_review",
  "approved",
  "rejected",
  "docs_required",
]);

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey().unique(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 20 }),
  role: varchar("role", { length: 20 }).default("user"), // 'user' or 'admin'
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Loan applications table
export const loanApplications = pgTable("loan_applications", {
  id: serial("id").primaryKey(),
  loanCode: varchar("loan_code", { length: 100 }).notNull().unique(),
  userId: varchar("userId", { length: 100 }).notNull(),
  loanType: varchar("loan_type", { length: 100 }).notNull(),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  files: jsonb("files"), // Array of file URLs
  status: statusEnum().default("pending"), // 'pending', 'under_review', 'approved', 'rejected', 'docs_required'
  submittedAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Documents table
export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  userId: serial("user_id")
    .references(() => users.id)
    .notNull(),
  applicationId: integer("application_id")
    .references(() => loanApplications.id)
    .notNull(),
  documentType: varchar("document_type", { length: 100 }).notNull(), // e.g., 'ID', 'Proof of Income', etc.

  secureUrl: jsonb("secure_url"), // From Cloudinary

  // metadata
  createdAt: timestamp("created_at").defaultNow(),
});

// Application comments table
export const applicationComments = pgTable("application_comments", {
  id: serial("id").primaryKey().unique(),
  applicationId: integer("application_id")
    .references(() => loanApplications.id)
    .notNull(),
  adminId: integer("admin_id").references(() => users.id),
  comment: text("comment").notNull(),
  commentType: varchar("comment_type", { length: 50 }).default("general"), // 'general', 'document_issue', 'approval', 'rejection'
  isInternal: boolean("is_internal").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Notifications table
export const notifications = pgTable("notifications", {
  id: uuid("id").defaultRandom().primaryKey().unique(),

  userId: varchar("user_id", { length: 100 }).notNull(),
  applicationId: integer("application_id").references(
    () => loanApplications.id
  ),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  type: varchar("type", { length: 50 }).notNull(),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const rooms = pgTable("rooms", {
  id: uuid("id").defaultRandom().primaryKey(),
  roomId: varchar("room_id", { length: 100 }).notNull().unique(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  adminId: varchar("admin_id", { length: 255 }), // nullable until admin joins
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});
