# Microsoft Entra ID

## Cadastro da aplicação

Crie um **App registration** de locatário único no Microsoft Entra ID com estas definições:

- Nome sugerido: `Raízes e Riquezas - Gestão de Projetos`
- Tipos de conta: somente contas deste diretório organizacional
- Plataforma: **Web**
- URI de redirecionamento de produção: `https://raizeseriquezas-projetos-production.up.railway.app/Projetos/auth/callback`
- Fluxos implícitos: desativados
- Permissões delegadas: `openid`, `profile` e `email`

Crie um segredo de cliente e guarde o **valor** no momento da criação. O identificador do segredo não funciona como credencial.

## Variáveis de produção

Configure no Sites:

- `ENTRA_TENANT_ID`: `bbcd91f5-1750-43ce-9e19-2ba84eba5d43` (identificador técnico legado do locatário; não alterar sem migrar o Entra ID)
- `ENTRA_CLIENT_ID`: ID do aplicativo em formato GUID
- `ENTRA_CLIENT_SECRET`: valor do segredo, marcado como secreto
- `AUTH_SESSION_SECRET`: segredo aleatório com pelo menos 32 bytes, marcado como secreto
- `ENTRA_REDIRECT_URI`: `https://raizeseriquezas-projetos-production.up.railway.app/Projetos/auth/callback`

Depois da configuração, publique a versão e altere a audiência do Site para pública. A aplicação continuará fechada: visitantes sem sessão serão encaminhados para `/login`, e as páginas e APIs exigirão uma sessão corporativa válida.

## Regras implementadas

- Authorization Code com PKCE e OpenID Connect
- validação de assinatura RS256 pelas chaves públicas do tenant
- validação de emissor, audiência, expiração, tenant, state e nonce
- sessão criptografada em cookie `HttpOnly`, `Secure` e `SameSite=Lax`
- duração máxima de oito horas
- primeiro usuário Entra cadastrado como Coordenador de Projetos
- demais usuários cadastrados como Keyuser até ajuste administrativo de perfil
- base do Portfólio entregue somente após autenticação
