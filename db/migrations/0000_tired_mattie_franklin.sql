CREATE TABLE "application_comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"application_id" integer NOT NULL,
	"admin_id" integer,
	"comment" text NOT NULL,
	"comment_type" varchar(50) DEFAULT 'general',
	"is_internal" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "application_comments_id_unique" UNIQUE("id")
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"loan_type" jsonb,
	"full_name" text,
	"permanent_address" text,
	"current_address" text,
	"secure_url" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "loan_applications" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" varchar(100) NOT NULL,
	"loan_type" varchar(100) NOT NULL,
	"full_name" varchar(255) NOT NULL,
	"files" jsonb,
	"status" varchar(50) DEFAULT 'pending',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(100) NOT NULL,
	"title" varchar(255) NOT NULL,
	"message" text NOT NULL,
	"type" varchar(50) NOT NULL,
	"is_read" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "notifications_id_unique" UNIQUE("id")
);
--> statement-breakpoint
CREATE TABLE "rooms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"room_id" varchar(100) NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"admin_id" varchar(255),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "rooms_room_id_unique" UNIQUE("room_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"full_name" varchar(255) NOT NULL,
	"phone" varchar(20),
	"role" varchar(20) DEFAULT 'user',
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_id_unique" UNIQUE("id"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "application_comments" ADD CONSTRAINT "application_comments_application_id_loan_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."loan_applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_comments" ADD CONSTRAINT "application_comments_admin_id_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;