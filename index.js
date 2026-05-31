import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import { authenticate, authorize, optionalAuth } from './lib/middleware/auth.js';
import {
  authController,
  clienteController,
  fornecedorController,
  materialController,
  servicoController,
  maquinaController,
  pedidoController,
  producaoController,
  financeiroController,
  dominioController
} from './lib/controllers/index.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Swagger config
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Differ ERP API',
      version: '1.0.0',
      description: 'API Node.js do Differ ERP',
    },
    servers: [
      { url: '/api', description: 'API base' }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: ['./index.js', './lib/controllers/*.js'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Swagger UI - configuração para Vercel (serverless)
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  swaggerOptions: {
    url: '/api/swagger.json',
    persistAuthorization: true
  }
}));

// Endpoint para swagger.json
app.get('/api/swagger.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

app.use(cors());
app.use(express.json());

const ok = (data, message) => ({ success: true, data, message });

/**
 * @openapi
 * /api/health:
 *   get:
 *     summary: Health check
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: API está rodando
 */
app.get('/api/health', authController.health);

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     summary: Login de usuário
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login bem-sucedido
 *       401:
 *         description: Credenciais inválidas
 */
app.post('/api/auth/login', authController.login);

/**
 * @openapi
 * /api/auth/setup-admin:
 *   post:
 *     summary: Configurar usuário admin (primeiro acesso)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               name:
 *                 type: string
 *     responses:
 *       200:
 *         description: Admin criado
 */
app.post('/api/auth/setup-admin', authController.setupAdmin);

// Auth routes (protegidas)
app.get('/api/auth/me', authenticate, authController.me);
app.get('/api/auth/usuarios', authenticate, authorize(['admin']), authController.listarUsuarios);
app.post('/api/auth/usuarios', authenticate, authorize(['admin']), authController.criarUsuario);
app.put('/api/auth/usuarios/:id/role', authenticate, authorize(['admin']), authController.atualizarRole);
app.delete('/api/auth/usuarios/:id', authenticate, authorize(['admin']), authController.removerUsuario);

// Clientes
app.get('/api/clientes', authenticate, authorize(['admin']), clienteController.listar);
app.get('/api/clientes/:id', authenticate, authorize(['admin']), clienteController.obter);
app.post('/api/clientes', authenticate, authorize(['admin']), clienteController.criar);
app.put('/api/clientes/:id', authenticate, authorize(['admin']), clienteController.atualizar);
app.delete('/api/clientes/:id', authenticate, authorize(['admin']), clienteController.excluir);

// Fornecedores
app.get('/api/fornecedores', authenticate, authorize(['admin']), fornecedorController.listar);
app.get('/api/fornecedores/:id', authenticate, authorize(['admin']), fornecedorController.obter);
app.post('/api/fornecedores', authenticate, authorize(['admin']), fornecedorController.criar);
app.put('/api/fornecedores/:id', authenticate, authorize(['admin']), fornecedorController.atualizar);
app.delete('/api/fornecedores/:id', authenticate, authorize(['admin']), fornecedorController.excluir);

// Materiais (admin e usuario podem listar/ver)
app.get('/api/materiais', authenticate, authorize(['admin', 'usuario']), materialController.listar);
app.get('/api/materiais/baixo-estoque', authenticate, authorize(['admin', 'usuario']), materialController.baixoEstoque);
app.get('/api/materiais/:id', authenticate, authorize(['admin', 'usuario']), materialController.obter);
app.get('/api/materiais/:id/movimentacoes', authenticate, authorize(['admin', 'usuario']), materialController.listarMovimentacoes);
app.post('/api/materiais', authenticate, authorize(['admin']), materialController.criar);
app.put('/api/materiais/:id', authenticate, authorize(['admin']), materialController.atualizar);
app.post('/api/materiais/:id/movimentacoes', authenticate, authorize(['admin', 'usuario']), materialController.lancarMovimentacao);
app.delete('/api/materiais/:id', authenticate, authorize(['admin']), materialController.excluir);

// Serviços
app.get('/api/servicos', authenticate, authorize(['admin']), servicoController.listar);
app.get('/api/servicos/:id', authenticate, authorize(['admin']), servicoController.obter);
app.post('/api/servicos', authenticate, authorize(['admin']), servicoController.criar);
app.put('/api/servicos/:id', authenticate, authorize(['admin']), servicoController.atualizar);
app.delete('/api/servicos/:id', authenticate, authorize(['admin']), servicoController.excluir);

// Máquinas
app.get('/api/maquinas', authenticate, authorize(['admin']), maquinaController.listar);
app.get('/api/maquinas/:id', authenticate, authorize(['admin']), maquinaController.obter);
app.post('/api/maquinas', authenticate, authorize(['admin']), maquinaController.criar);
app.put('/api/maquinas/:id', authenticate, authorize(['admin']), maquinaController.atualizar);
app.delete('/api/maquinas/:id', authenticate, authorize(['admin']), maquinaController.excluir);

// Pedidos
app.get('/api/pedidos', authenticate, authorize(['admin']), pedidoController.listar);
app.get('/api/pedidos/:id', authenticate, authorize(['admin']), pedidoController.obter);
app.post('/api/pedidos', authenticate, authorize(['admin']), pedidoController.criar);
app.put('/api/pedidos/:id', authenticate, authorize(['admin']), pedidoController.atualizar);
app.patch('/api/pedidos/:id/status', authenticate, authorize(['admin']), pedidoController.atualizarStatus);
app.delete('/api/pedidos/:id', authenticate, authorize(['admin']), pedidoController.cancelar);

// Produção (admin e usuario)
app.get('/api/producao', authenticate, authorize(['admin', 'usuario']), producaoController.listar);
app.get('/api/producao/:id', authenticate, authorize(['admin', 'usuario']), producaoController.obter);
app.post('/api/producao', authenticate, authorize(['admin', 'usuario']), producaoController.criar);
app.put('/api/producao/:id', authenticate, authorize(['admin', 'usuario']), producaoController.atualizar);
app.patch('/api/producao/:id/status', authenticate, authorize(['admin', 'usuario']), producaoController.atualizarStatus);
app.delete('/api/producao/:id', authenticate, authorize(['admin']), producaoController.cancelar);

// Financeiro
app.get('/api/financeiro', authenticate, authorize(['admin']), financeiroController.listar);
app.get('/api/financeiro/pagar', authenticate, authorize(['admin']), financeiroController.listarPagar);
app.get('/api/financeiro/receber', authenticate, authorize(['admin']), financeiroController.listarReceber);
app.get('/api/financeiro/resumo', authenticate, authorize(['admin']), financeiroController.resumo);
app.get('/api/financeiro/:id', authenticate, authorize(['admin']), financeiroController.obter);
app.post('/api/financeiro', authenticate, authorize(['admin']), financeiroController.criar);
app.put('/api/financeiro/:id', authenticate, authorize(['admin']), financeiroController.atualizar);
app.post('/api/financeiro/:id/baixar', authenticate, authorize(['admin']), financeiroController.baixar);

// Domínio
app.get('/api/dominio/:tabela', authenticate, authorize(['admin']), dominioController.listar);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Rota não encontrada' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: err.message || 'Erro interno' });
});

// Start server (local dev)
if (process.env.NODE_ENV !== 'vercel') {
  app.listen(PORT, () => {
    console.log(`API rodando na porta ${PORT}`);
  });
}

export default app;
