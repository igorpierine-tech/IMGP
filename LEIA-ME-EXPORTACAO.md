# Raízes e Riquezas — Plataforma de Gestão de Projetos

Pacote completo de exportação da versão 44, referência de código `7ab28f17aa4de43103783b6c8f2e7fec2583a518`.

## Conteúdo do pacote

- Código-fonte da aplicação web.
- Build publicado em `dist/`.
- Esquema e migrações Cloudflare D1/Drizzle.
- Estrutura inicial da migração para Supabase.
- Snapshots históricos de projetos, tarefas, recursos e demandas usados pela aplicação.
- Arquivos de configuração e exemplo de variáveis de ambiente.
- Documento de transição da gestão em `documentacao/`.

## Compatibilidade preservada

O rebranding altera a identidade visual e os textos institucionais para Raízes e Riquezas. As conexões ativas com o GLPI foram removidas. Identificadores internos, chaves de armazenamento local e snapshots já incorporados foram preservados apenas para manter o histórico existente.

## Requisitos

- Node.js 22.13 ou superior.
- NPM compatível com o `package-lock.json`.
- Conta/ambiente Cloudflare para o backend D1 atual.
- Projeto Supabase para continuar a migração, caso essa arquitetura seja adotada.

## Instalação para desenvolvimento

1. Extraia o arquivo ZIP.
2. Abra um terminal na pasta extraída.
3. Copie `.env.example` para `.env.local`.
4. Preencha somente no ambiente seguro as variáveis necessárias.
5. Execute `npm ci`.
6. Execute `npm run dev`.

## Build e execução local

- Gerar o build: `npm run build`
- Executar o build local: `npm run start`
- Validar Supabase: `npm run supabase:preflight`

## Dados e segredos

O pacote contém os snapshots de dados usados na versão exportada, mas não contém tokens, senhas, chaves privadas nem o conteúdo vivo do banco D1 hospedado. Os segredos devem ser recriados no ambiente de destino. Para transferir o estado operacional completo, exporte também o banco produtivo no momento da migração e restaure-o após aplicar as migrações.

## Pastas deliberadamente excluídas

- `node_modules/`: reconstruída por `npm ci`.
- `.next/`, `.wrangler/` e `.sites-runtime/`: caches e estado local.
- `.git/`: histórico local de desenvolvimento.
- `work/`: arquivos temporários de validação visual.

## Segurança

Antes de disponibilizar a aplicação em outro ambiente, configure RBAC, rotação de segredos, backup e trilha de auditoria. Nunca grave credenciais reais no repositório.
