CREATE TABLE `fieldwise_records` (
	`user_id` text NOT NULL,
	`record_key` text NOT NULL,
	`payload_json` text NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`user_id`, `record_key`),
	CONSTRAINT "fieldwise_records_record_key_check" CHECK("fieldwise_records"."record_key" in ('fw-context', 'fw-plans', 'fw-tasks', 'fw-bills', 'fw-subscription'))
);
