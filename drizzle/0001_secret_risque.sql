CREATE TABLE `public_match_listings` (
	`match_code` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`match_code`) REFERENCES `matches`(`code`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `public_match_listings_created_idx` ON `public_match_listings` (`created_at`);