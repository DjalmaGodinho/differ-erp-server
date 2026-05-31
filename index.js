import 'dotenv/config';
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
const PORT = process.env.PORT || 8080;

// CORS - must be before all routes
const corsOptions = {
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());

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

// Endpoint de teste de conexão com banco
app.get('/api/test-db', async (req, res) => {
  try {
    console.log('Testando conexão...');
    const { query } = await import('./lib/config/database.js');
    const result = await query('SELECT NOW() as server_time, current_database() as database');
    const userResult = await query('SELECT COUNT(*) as total FROM user_profiles WHERE ativo = true');
    
    res.json({
      success: true,
      message: 'Conexão com banco OK',
      data: {
        server_time: result.rows[0].server_time,
        database: result.rows[0].database,
        usuarios_ativos: parseInt(userResult.rows[0].total),
        database_url_configured: !!process.env.DATABASE_URL
      }
    });
  } catch (error) {
    console.error('Erro na conexão:', error);
    res.status(500).json({
      success: false,
      message: 'Erro na conexão com banco',
      error: error.message,
      database_url_configured: !!process.env.DATABASE_URL
    });
  }
});

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

app.post('/api/auth/refresh', async (req, res) => {
  const { refresh_token } = req.body;
  if (!refresh_token) {
    return res.status(400).json({ success: false, message: 'refresh_token obrigatório' });
  }
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const anonKey = process.env.SUPABASE_ANON_KEY;
    const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': anonKey },
      body: JSON.stringify({ refresh_token })
    });
    if (!response.ok) {
      return res.status(401).json({ success: false, message: 'Refresh token inválido ou expirado' });
    }
    const data = await response.json();
    res.json(ok({ access_token: data.access_token, refresh_token: data.refresh_token }, 'Token renovado'));
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

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

// Dashboard
app.get('/api/dashboard', authenticate, authorize(['admin', 'usuario']), async (req, res) => {
  try {
    const { query } = await import('./lib/config/database.js');

    const [clientesAtivos, pedidosMes, finRes, estoqueTotal, producaoStats, ultimosPedidos, opsAndamento] = await Promise.all([
      query(`SELECT COUNT(*) as total FROM clientes WHERE ativo = true`),
      query(`SELECT COUNT(*) as total FROM pedidos WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW())`),
      query(`
        SELECT 
          COALESCE(SUM(CASE WHEN tipo_id = 2 AND status_id != 2 THEN valor ELSE 0 END), 0) as faturamento_pendente,
          COALESCE(SUM(CASE WHEN tipo_id = 2 AND status_id = 2 AND DATE_TRUNC('month', data_pagamento) = DATE_TRUNC('month', NOW()) THEN valor_pago ELSE 0 END), 0) as faturamento_mes
        FROM contas_financeiro
      `),
      query(`SELECT COUNT(*) as total FROM materiais WHERE ativo = true`),
      query(`
        SELECT 
          COUNT(*) FILTER (WHERE so.nome = 'Planejada') as planejadas,
          COUNT(*) FILTER (WHERE so.nome = 'Em Andamento') as em_andamento,
          COUNT(*) FILTER (WHERE so.nome = 'Concluída') as concluidas
        FROM ordens_producao op
        LEFT JOIN status_op so ON op.status_id = so.id
      `),
      query(`
        SELECT p.numero, c.nome as cliente_nome, p.valor_total, sp.nome as status_nome
        FROM pedidos p
        LEFT JOIN clientes c ON p.cliente_id = c.id
        LEFT JOIN status_pedido sp ON p.status_id = sp.id
        ORDER BY p.created_at DESC LIMIT 5
      `),
      query(`
        SELECT op.codigo as ordem, op.produto_descricao as produto, op.quantidade,
               m.nome as maquina, so.nome as status_nome
        FROM ordens_producao op
        LEFT JOIN maquinas m ON op.maquina_id = m.id
        LEFT JOIN status_op so ON op.status_id = so.id
        WHERE so.nome = 'Em Andamento'
        ORDER BY op.created_at DESC LIMIT 5
      `)
    ]);

    res.json({
      success: true,
      data: {
        clientesAtivos: parseInt(clientesAtivos.rows[0].total),
        pedidosMes: parseInt(pedidosMes.rows[0].total),
        faturamentoMes: parseFloat(finRes.rows[0].faturamento_mes || 0),
        faturamentoPendente: parseFloat(finRes.rows[0].faturamento_pendente || 0),
        totalEstoque: parseInt(estoqueTotal.rows[0].total),
        producao: {
          planejadas: parseInt(producaoStats.rows[0].planejadas || 0),
          emAndamento: parseInt(producaoStats.rows[0].em_andamento || 0),
          concluidas: parseInt(producaoStats.rows[0].concluidas || 0),
        },
        ultimosPedidos: ultimosPedidos.rows,
        opsEmAndamento: opsAndamento.rows,
      }
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

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
