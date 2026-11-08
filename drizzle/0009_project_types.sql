CREATE TABLE `project_types` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`sequence` integer DEFAULT 0 NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_by` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `project_types_name_unique` ON `project_types` (`name`);--> statement-breakpoint
CREATE INDEX `project_types_active_sequence_idx` ON `project_types` (`active`,`sequence`);--> statement-breakpoint
INSERT INTO `project_types` (`name`,`description`,`sequence`) VALUES
('Automação','Automação de processos, rotinas e fluxos de trabalho.',10),
('Implementação','Implantação de solução, sistema ou plataforma.',20),
('Desenvolvimento de Software','Construção de nova aplicação ou produto digital.',30),
('Evolução / Melhoria','Ampliação funcional, melhoria de uso ou nova versão de solução existente.',40),
('Integração de Sistemas','Conexão entre sistemas, APIs, dados e serviços.',50),
('Migração / Conversão de Dados','Migração de plataforma, carga, saneamento ou conversão de dados.',60),
('Infraestrutura e Redes','Servidores, redes, dispositivos, conectividade e ambientes.',70),
('Cloud / Nuvem','Adoção, migração ou implantação de recursos em nuvem.',80),
('Segurança da Informação','Proteção, identidade, controles, resposta e redução de riscos.',90),
('Dados, BI e Analytics','Dados, indicadores, relatórios, inteligência e análises.',100),
('Modernização Tecnológica','Replataforma, refatoração ou renovação de tecnologia legada.',110),
('Inovação / Prova de Conceito','Experimento, protótipo ou validação de uma nova solução.',120),
('Conformidade / Regulatório','Adequação a requisitos legais, normativos ou de auditoria.',130),
('Implantação de Serviço de TI','Criação ou alteração estruturada de um serviço de TI.',140),
('Desativação / Substituição','Retirada controlada ou substituição de sistema ou tecnologia.',150);--> statement-breakpoint
ALTER TABLE `projects` ADD `project_type_id` integer REFERENCES `project_types`(`id`) ON DELETE set null;--> statement-breakpoint
ALTER TABLE `demands` ADD `project_type_id` integer REFERENCES `project_types`(`id`) ON DELETE set null;--> statement-breakpoint
UPDATE `projects` SET `project_type_id` = (SELECT `id` FROM `project_types` WHERE `name` = 'Implementação') WHERE lower(json_extract(`raw_json`, '$.type')) LIKE '%implementa%';--> statement-breakpoint
UPDATE `projects` SET `project_type_id` = (SELECT `id` FROM `project_types` WHERE `name` = 'Evolução / Melhoria') WHERE lower(json_extract(`raw_json`, '$.type')) LIKE '%melhoria%';
