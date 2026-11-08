# Migração para Raízes e Riquezas no Railway

## Endereço canônico

- Aplicação: `https://raizeseriquezas-projetos-production.up.railway.app/Projetos`
- Login: `https://raizeseriquezas-projetos-production.up.railway.app/Projetos/login`
- Callback Microsoft Entra ID: `https://raizeseriquezas-projetos-production.up.railway.app/Projetos/auth/callback`

A aplicação foi configurada com o caminho-base `/Projetos`. Rotas, APIs, arquivos estáticos e cookies ficam restritos a esse caminho.

## Pendências externas

1. Publicar esta versão no serviço de hospedagem.
2. Manter o domínio do serviço Railway ativo e associado ao ambiente de produção.
3. Atualizar no Microsoft Entra ID a URI de redirecionamento para `https://raizeseriquezas-projetos-production.up.railway.app/Projetos/auth/callback`.
4. Definir `ENTRA_REDIRECT_URI` com o mesmo valor no ambiente de produção.
5. Se o Supabase Auth for ativado, adicionar `https://raizeseriquezas-projetos-production.up.railway.app/Projetos/**` às URLs permitidas.

## Railway

O projeto inclui `Dockerfile`, `.railway/railway.ts` e inicialização específica para Railway. O serviço aplica as migrações antes de iniciar e mantém o estado do banco em `/data`; por isso, o serviço deve ter um Railway Volume montado nesse caminho.

O primeiro acesso é feito em `/Projetos/login?setup=1`. O token de ativação deve ser consultado na variável protegida `AUTH_BOOTSTRAP_TOKEN` do Railway e digitado no formulário; ele não deve ser colocado na URL.

O domínio fornecido pelo Railway aceita um único rótulo antes de `up.railway.app`; por isso, a identidade Raízes e Riquezas usa hífens no hostname e mantém `/Projetos` como caminho-base da aplicação.
