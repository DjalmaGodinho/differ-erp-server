import { authService } from '../services/index.js';
import { query } from '../config/database.js';

const ok = (data, message) => ({ success: true, data, message });
const fail = (message) => ({ success: false, message });

const authController = {
  async login(req, res) {
    try {
      const { email, senha } = req.body;
      if (!email || !senha) {
        return res.status(400).json(fail('Email e senha são obrigatórios'));
      }
      const result = await authService.login(email, senha);
      res.json(ok(result, `Login realizado. Role: ${result.role}`));
    } catch (e) {
      res.status(401).json(fail(e.message));
    }
  },

  async me(req, res) {
    const user = req.user;
    res.json(ok({
      id: user.id,
      nome: user.name,
      email: user.email,
      role: user.role,
      roles: [user.role],
      ativo: true
    }, 'Autenticação OK'));
  },

  async listarUsuarios(req, res) {
    try {
      const users = await authService.listarUsuarios();
      res.json(ok(users));
    } catch (e) {
      res.status(400).json(fail(e.message));
    }
  },

  async criarUsuario(req, res) {
    try {
      const { email, senha, nome, role } = req.body;
      if (!email || !senha) {
        return res.status(400).json(fail('Email e senha são obrigatórios'));
      }
      if (senha.length < 6) {
        return res.status(400).json(fail('Senha deve ter pelo menos 6 caracteres'));
      }
      const result = await authService.criarUsuario({ email, senha, nome, role });
      res.status(201).json(ok(result, 'Usuário criado com sucesso'));
    } catch (e) {
      res.status(400).json(fail(e.message));
    }
  },

  async atualizarRole(req, res) {
    try {
      const { id } = req.params;
      const { role } = req.body;
      await authService.atualizarRole(id, role);
      res.json(ok(null, `Role atualizado para '${role}'`));
    } catch (e) {
      res.status(400).json(fail(e.message));
    }
  },

  async removerUsuario(req, res) {
    try {
      const { id } = req.params;
      await authService.removerUsuario(id);
      res.json(ok(null, 'Usuário inativado com sucesso'));
    } catch (e) {
      res.status(400).json(fail(e.message));
    }
  },

  async setupAdmin(req, res) {
    try {
      const { email, senha, nome, role, userId } = req.body;
      if (!email || !senha || !nome) {
        return res.status(400).json(fail('Email, senha e nome são obrigatórios'));
      }
      if (senha.length < 6) {
        return res.status(400).json(fail('Senha deve ter pelo menos 6 caracteres'));
      }
      const result = await authService.setupAdmin({ email, senha, nome, role, userId });
      res.json(ok(result, 'Setup concluído'));
    } catch (e) {
      res.status(400).json(fail(e.message));
    }
  },

  async health(req, res) {
    try {
      const dbResult = await query('SELECT COUNT(*) FROM user_profiles');
      res.json(ok({
        status: 'OK',
        databaseConnected: true,
        userCount: parseInt(dbResult.rows[0].count),
        timestamp: new Date().toISOString()
      }, 'API está rodando'));
    } catch (e) {
      res.status(500).json(fail('Erro na conexão: ' + e.message));
    }
  }
};

export default authController;
