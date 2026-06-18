# Differ ERP - Guia de Segurança

Este documento descreve as medidas de segurança implementadas para proteger dados sensíveis contra vazamentos e ataques.

## 🔒 Camadas de Proteção

### 1. Criptografia de Dados Pessoais (PII)

**O que é protegido:**
- E-mails de clientes
- Telefones (fixo e celular)
- Documentos (CPF/CNPJ)

**Como funciona:**
- Algoritmo: **AES-256-GCM** (padrão militar)
- Campos são criptografados antes de serem salvos no banco
- Descriptografados automaticamente quando lidos pela aplicação
- Se o banco for comprometido, os dados permanecem protegidos

**Configuração:**
```bash
# Gere uma chave de 32 bytes (256 bits)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Adicione ao .env
PII_ENCRYPTION_KEY=sua_chave_hex_aqui
```

### 2. Proteção de Credenciais SMTP

**Anterior (Inseguro):**
- Credenciais em arquivo JSON (`smtp.json`)
- Risco de commit acidental
- Exposto no sistema de arquivos

**Novo (Seguro):**
- Credenciais em variáveis de ambiente
- Nunca expostas em arquivos
- Gerenciáveis via secrets em produção

**Variáveis necessárias:**
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=seu-email@gmail.com
SMTP_PASS=sua-senha-de-app  # NUNCA use a senha principal
SMTP_FROM_NAME=DG-MECH Usinagem
SMTP_FROM_EMAIL=seu-email@gmail.com
```

**Para Gmail:**
1. Ative 2FA na conta Google
2. Gere uma "Senha de App" em: Segurança > Senhas de app
3. Use essa senha no `SMTP_PASS`

### 3. Headers de Segurança HTTP (Helmet)

Implementados automaticamente:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- Content Security Policy (CSP)
- E outros headers OWASP recomendados

### 4. Auditoria de Segurança

Tabela `security_audit` registra:
- Tentativas de login (sucesso/falha)
- Mudanças de dados sensíveis
- Acesso a endpoints críticos
- IP e User Agent para rastreamento

### 5. Proteção de Arquivos Sensíveis

Arquivos adicionados ao `.gitignore`:
```
/lib/config/smtp.json
/lib/config/encryption.key
*.key
*.pem
secrets/
```

## ⚠️ Checklist de Segurança

### Ambiente de Desenvolvimento
- [ ] Nunca commite arquivos `.env`
- [ ] Use `.env.example` como template
- [ ] Configure `PII_ENCRYPTION_KEY` antes de criar clientes
- [ ] Configure variáveis SMTP_* para testar e-mails

### Ambiente de Produção
- [ ] Use secrets management (Vercel Secrets, AWS Secrets Manager)
- [ ] Habilite HTTPS apenas
- [ ] Configure rate limiting no WAF
- [ ] Monitore a tabela `security_audit`
- [ ] Faça backup da `PII_ENCRYPTION_KEY` (sem ela, dados são perdidos!)

## 🚨 Em Caso de Breach

1. **Roteie as credenciais imediatamente:**
   - Troque `PII_ENCRYPTION_KEY` (ATENÇÃO: dados antigos ficarão ilegíveis)
   - Troque senhas SMTP
   - Troque DATABASE_URL

2. **Investigue:**
   ```sql
   SELECT * FROM security_audit 
   WHERE created_at > NOW() - INTERVAL '24 hours'
   ORDER BY created_at DESC;
   ```

3. **Notifique:**
   - Clientes afetados (se houver vazamento de dados)
   - Autoridades (LGPD/GDPR compliance)

## 📊 Verificação de Status

Endpoint para admins verificar segurança:
```
GET /api/security/status
```

Retorna status de:
- Criptografia PII
- Configuração SMTP
- Headers de segurança

## 🔧 Instalação

```bash
cd differ-erp-server

# Instale as novas dependências
npm install

# Configure as variáveis de ambiente
cp .env.example .env
# Edite .env com suas credenciais

# Execute as migrations
# (Use sua ferramenta preferida para executar SQL)
# migrations/009_pii_encryption.sql
```

## 📞 Suporte

Em caso de dúvidas sobre segurança:
1. Verifique os logs do servidor
2. Consulte a tabela `security_audit`
3. Verifique o endpoint `/api/security/status`
