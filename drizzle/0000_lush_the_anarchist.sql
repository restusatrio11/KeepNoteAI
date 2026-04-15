CREATE TABLE "daily_planning" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"tanggal" date DEFAULT now() NOT NULL,
	"content" text NOT NULL,
	"color" text NOT NULL,
	"reminder_time" timestamp,
	"is_done" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "laporan" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"tanggal" date NOT NULL,
	"rencana_id" uuid NOT NULL,
	"kegiatan" text NOT NULL,
	"progress" text NOT NULL,
	"capaian" text NOT NULL,
	"bukti_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "master_rencana" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"tim_id" uuid,
	"nama" text NOT NULL,
	"kode" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notulen" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"judul" text NOT NULL,
	"tanggal" date NOT NULL,
	"waktu" text,
	"tempat" text,
	"pemimpin" text,
	"topik" text,
	"notulis" text,
	"peserta" text,
	"konten" text NOT NULL,
	"undangan_url" text,
	"daftar_hadir_url" text,
	"dokumentasi_urls" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tim_kerja" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"nama" text NOT NULL,
	"keterangan" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"drive_folder_id" text,
	"health_score" integer,
	"health_status" text,
	"health_message" text,
	"last_report_count" integer,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_settings_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "daily_planning" ADD CONSTRAINT "daily_planning_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "laporan" ADD CONSTRAINT "laporan_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "laporan" ADD CONSTRAINT "laporan_rencana_id_master_rencana_id_fk" FOREIGN KEY ("rencana_id") REFERENCES "public"."master_rencana"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "master_rencana" ADD CONSTRAINT "master_rencana_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "master_rencana" ADD CONSTRAINT "master_rencana_tim_id_tim_kerja_id_fk" FOREIGN KEY ("tim_id") REFERENCES "public"."tim_kerja"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notulen" ADD CONSTRAINT "notulen_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tim_kerja" ADD CONSTRAINT "tim_kerja_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;