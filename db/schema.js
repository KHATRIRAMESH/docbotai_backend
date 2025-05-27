import { json } from "drizzle-orm/gel-core";
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
} from "drizzle-orm/pg-core";

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
  userId: integer("user_id")
    .references(() => users.id)
    .notNull(),
  loanType: varchar("loan_type", { length: 100 }).notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }),
  purpose: text("purpose"),
  employmentType: varchar("employment_type", { length: 50 }),
  monthlyIncome: decimal("monthly_income", { precision: 12, scale: 2 }),
  status: varchar("status", { length: 50 }).default("pending"), // 'pending', 'under_review', 'approved', 'rejected', 'docs_required'
  adminNotes: text("admin_notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Documents table
export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  loanType: jsonb("loan_type"),
  fullName: text("full_name"),
  permanentAddress: text("permanent_address"),
  currentAddress: text("current_address"),

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
  id: serial("id").primaryKey().unique(),
  userId: integer("user_id")
    .references(() => users.id)
    .notNull(),
  applicationId: integer("application_id").references(
    () => loanApplications.id
  ),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  type: varchar("type", { length: 50 }).notNull(), // 'document_uploaded', 'admin_comment', 'status_change', etc.
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});
