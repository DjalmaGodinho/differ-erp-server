# Differ ERP API (Node.js)

API Node.js/Express para o Differ ERP, compatível com Vercel.

## Estrutura

```
api/
├── config/
│   └── database.js          # Conexão PostgreSQL
├── controllers/             # Endpoints HTTP
├── middleware/
│   └── auth.js              # JWT + autorização
├── repositories/            # Acesso ao banco
├── services/                # Lógica de negócio
├── index.js                 # Entry point
└── package.json
```

## Arquitetura

**Controller → Service → Repository**

- **Controller**: Recebe requisições HTTP, valida entrada, chama service, retorna resposta
- **Service**: Contém regra de negócio, validações, cálculos
- **Repository**: Acesso direto ao banco PostgreSQL

## Instalação

```bash
cd api
npm install
```

## Variáveis de Ambiente

```env
DATABASE_URL=postgresql://...
SUPABASE_URL=https://...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...  # Opcional, para criar usuários
```

## Desenvolvimento

```bash
npm run dev
```

## Deploy Vercel

O projeto está configurado para deploy automático na Vercel:
- Frontend: `dist/` (Vite build)
- API: `api/index.js` (Node.js)

## Endpoints

### Auth
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Dados do usuário logado
- `GET /api/auth/usuarios` - Listar usuários (admin)
- `POST /api/auth/usuarios` - Criar usuário (admin)
- `PUT /api/auth/usuarios/:id/role` - Atualizar role (admin)
- `DELETE /api/auth/usuarios/:id` - Remover usuário (admin)
- `POST /api/auth/setup-admin` - Setup inicial (público)

### Clientes
- `GET /api/clientes` - Listar
- `GET /api/clientes/:id` - Obter
- `POST /api/clientes` - Criar
- `PUT /api/clientes/:id` - Atualizar
- `DELETE /api/clientes/:id` - Excluir (inativa)

### Fornecedores
- `GET /api/fornecedores` - Listar
- `GET /api/fornecedores/:id` - Obter
- `POST /api/fornecedores` - Criar
- `PUT /api/fornecedores/:id` - Atualizar
- `DELETE /api/fornecedores/:id` - Excluir (inativa)

### Materiais
- `GET /api/materiais` - Listar
- `GET /api/materiais/baixo-estoque` - Listar com estoque baixo
- `GET /api/materiais/:id` - Obter
- `POST /api/materiais` - Criar
- `PUT /api/materiais/:id` - Atualizar
- `POST /api/materiais/:id/movimentacoes` - Lançar movimentação
- `GET /api/materiais/:id/movimentacoes` - Listar movimentações
- `DELETE /api/materiais/:id` - Excluir (inativa)

### Serviços, Máquinas, Pedidos, Produção, Financeiro
- Seguem mesmo padrão CRUD

### Domínio
- `GET /api/dominio/:tabela` - Listar valores de domínio

## Autenticação

Todas as rotas (exceto login e setup-admin) requerem header:
```
Authorization: Bearer <token_jwt>
```

O token é validado contra o JWKS do Supabase.

## Resposta Padrão

```json
{
  "success": true|false,
  "data": {},
  "message": "..."
}
```
