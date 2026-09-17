CREATE TABLE `duoMembers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`duoId` int NOT NULL,
	`userId` int NOT NULL,
	`nickname` varchar(80),
	`joinedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `duoMembers_id` PRIMARY KEY(`id`),
	CONSTRAINT `duoMembers_duo_user_unique` UNIQUE(`duoId`,`userId`)
);
--> statement-breakpoint
CREATE TABLE `duos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`inviteCode` varchar(12) NOT NULL,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `duos_id` PRIMARY KEY(`id`),
	CONSTRAINT `duos_inviteCode_unique` UNIQUE(`inviteCode`)
);
--> statement-breakpoint
CREATE TABLE `taskCompletions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`taskId` int NOT NULL,
	`userId` int NOT NULL,
	`dayKey` varchar(10) NOT NULL,
	`isDone` int NOT NULL DEFAULT 1,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `taskCompletions_id` PRIMARY KEY(`id`),
	CONSTRAINT `taskCompletions_task_user_day_unique` UNIQUE(`taskId`,`userId`,`dayKey`)
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`duoId` int NOT NULL,
	`title` varchar(240) NOT NULL,
	`category` varchar(64) NOT NULL DEFAULT 'Daily',
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `tasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` varchar(20) NOT NULL DEFAULT 'user';--> statement-breakpoint
CREATE INDEX `duoMembers_user_idx` ON `duoMembers` (`userId`);--> statement-breakpoint
CREATE INDEX `taskCompletions_day_idx` ON `taskCompletions` (`dayKey`);--> statement-breakpoint
CREATE INDEX `tasks_duo_idx` ON `tasks` (`duoId`);