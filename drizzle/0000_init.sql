CREATE TABLE "bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_type_id" text NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"guest_name" text NOT NULL,
	"guest_email" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bookings_time_valid" CHECK ("bookings"."ends_at" > "bookings"."starts_at"),
	CONSTRAINT "bookings_guest_name_length" CHECK (char_length(btrim("bookings"."guest_name")) between 1 and 100),
	CONSTRAINT "bookings_guest_email_length" CHECK (char_length(btrim("bookings"."guest_email")) between 3 and 254)
);
--> statement-breakpoint
CREATE TABLE "event_types" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"duration_minutes" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "event_types_id_format" CHECK ("event_types"."id" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
	CONSTRAINT "event_types_id_length" CHECK (char_length("event_types"."id") between 1 and 64),
	CONSTRAINT "event_types_title_length" CHECK (char_length(btrim("event_types"."title")) between 1 and 100),
	CONSTRAINT "event_types_description_length" CHECK (char_length("event_types"."description") <= 500),
	CONSTRAINT "event_types_duration_range" CHECK ("event_types"."duration_minutes" between 5 and 540 and "event_types"."duration_minutes" % 5 = 0)
);
--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_event_type_id_event_types_id_fk" FOREIGN KEY ("event_type_id") REFERENCES "public"."event_types"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bookings_starts_at_idx" ON "bookings" USING btree ("starts_at");