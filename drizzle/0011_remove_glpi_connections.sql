DELETE FROM `sync_runs` WHERE `provider` = 'glpi';
DELETE FROM `integration_connections` WHERE `provider` = 'glpi';
DROP TABLE IF EXISTS `sync_runs`;
DROP TABLE IF EXISTS `integration_connections`;
