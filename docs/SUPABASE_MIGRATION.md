# Migracao para Supabase

## Estado atual

A primeira etapa foi preparada sem alterar o backend da producao:

- dependencias oficiais `@supabase/supabase-js` e `@supabase/ssr` instaladas;
- esquema PostgreSQL completo criado em `supabase/migrations`;
- RLS habilitado em todas as tabelas expostas;
- perfis de acesso equivalentes aos da aplicacao atual;
- auditoria configurada como append-only;
- Realtime preparado para projetos, itens e apontamentos;
- cliente administrativo exclusivo do servidor;
- selecao de backend por `DATA_BACKEND`, com `d1` como padrao seguro;
- preflight de banco e Auth disponivel por `npm run supabase:preflight`.

## Dados necessarios para conectar o projeto

Criar um projeto Supabase gerenciado e cadastrar os valores abaixo como segredos do ambiente:

- `SUPABASE_URL`;
- `SUPABASE_PUBLISHABLE_KEY`;
- `SUPABASE_SECRET_KEY`;
- `DATA_BACKEND=d1` durante a carga e a validacao paralela.

A chave secreta nunca deve ser gravada no repositorio ou enviada ao navegador.

## Ordem de execucao

1. Aplicar `supabase/migrations/20261014000100_initial_platform.sql`.
2. Aplicar `supabase/seed.sql`.
3. Executar `npm run supabase:preflight`.
4. Criar os usuarios no Supabase Auth e relacionar `profiles.legacy_id` aos IDs atuais.
5. Migrar cadastros na ordem: tipos, usuarios, projetos, fases, sprints, itens, membros, demandas, aprovacoes, apontamentos e auditoria.
6. Comparar contagens, chaves externas, hierarquias e totais de horas entre D1 e PostgreSQL.
7. Ativar leitura paralela para homologacao.
8. Trocar `DATA_BACKEND` para `supabase` depois do aceite.

## Autenticacao

Senhas e sessoes do D1 nao serao copiadas. Cada usuario sera criado no Supabase Auth com senha inicial definida pelo administrador ou por convite. A tabela `profiles` armazena perfil, situacao e dados corporativos; nenhum hash de senha fica nela.

O cadastro publico permanece desativado. Novos usuarios devem ser criados por uma operacao administrativa no servidor. O provedor Azure/Microsoft pode ser habilitado em paralelo depois da validacao do login por email e senha.

## Reversao

Enquanto `DATA_BACKEND=d1`, a publicacao atual continua como fonte de verdade. A mudanca definitiva so ocorre depois que a comparacao de dados, o login, as permissoes e o apontamento de horas forem aprovados em homologacao.
