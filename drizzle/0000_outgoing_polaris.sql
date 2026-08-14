CREATE TABLE `match_sets` (
	`match_code` text NOT NULL,
	`set_number` integer NOT NULL,
	`team_a_score` integer NOT NULL,
	`team_b_score` integer NOT NULL,
	`winner` text NOT NULL,
	`created_at` text NOT NULL,
	PRIMARY KEY(`match_code`, `set_number`),
	FOREIGN KEY (`match_code`) REFERENCES `matches`(`code`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `matches` (
	`code` text PRIMARY KEY NOT NULL,
	`edit_token_hash` text NOT NULL,
	`sport` text DEFAULT 'volleyball' NOT NULL,
	`team_a_name` text NOT NULL,
	`team_a_color` text NOT NULL,
	`team_b_name` text NOT NULL,
	`team_b_color` text NOT NULL,
	`points_a` integer DEFAULT 0 NOT NULL,
	`points_b` integer DEFAULT 0 NOT NULL,
	`sets_a` integer DEFAULT 0 NOT NULL,
	`sets_b` integer DEFAULT 0 NOT NULL,
	`current_set` integer DEFAULT 1 NOT NULL,
	`best_of` integer DEFAULT 3 NOT NULL,
	`left_team` text DEFAULT 'a' NOT NULL,
	`status` text DEFAULT 'live' NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`expires_at` text NOT NULL
);
