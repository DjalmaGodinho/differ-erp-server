import { financeiroService, auditService } from '../services/index.js';

const ok = (data, message) => ({ success: true, data, message });
const fail = (message) => ({ success: false, message });

const financeiroController = {
  async listar(req, res) {
    try {
      const { page = 1, pageSize = 20, search, tipoId, statusId, dataInicio, dataFim } = req.query;
      const result = await financeiroService.listar({ 
        page: parseInt(page), 
        pageSize: parseInt(pageSize), 
        search, 
        tipoId: tipoId ? parseInt(tipoId) : null,
        statusId: statusId ? parseInt(statusId) : null,
        dataInicio,
        dataFim
      });
      res.json(ok(result));
    } catch (e) {
      res.status(400).json(fail(e.message));
    }
  },

  async listarPagar(req, res) {
    try {
      const { page = 1, pageSize = 20, search, statusId, dataInicio, dataFim } = req.query;
      const result = await financeiroService.listarPagar({ 
        page: parseInt(page), 
        pageSize: parseInt(pageSize), 
        search, 
        statusId: statusId ? parseInt(statusId) : null,
        dataInicio,
        dataFim
      });
      res.json(ok(result));
    } catch (e) {
      res.status(400).json(fail(e.message));
    }
  },

  async listarReceber(req, res) {
    try {
      const { page = 1, pageSize = 20, search, statusId, dataInicio, dataFim } = req.query;
      const result = await financeiroService.listarReceber({ 
        page: parseInt(page), 
        pageSize: parseInt(pageSize), 
        search, 
        statusId: statusId ? parseInt(statusId) : null,
        dataInicio,
        dataFim
      });
      res.json(ok(result));
    } catch (e) {
      res.status(400).json(fail(e.message));
    }
  },

  async resumo(req, res) {
    try {
      const result = await financeiroService.resumo();
      res.json(ok(result));
    } catch (e) {
      res.status(400).json(fail(e.message));
    }
  },

  async obter(req, res) {
    try {
      const { id } = req.params;
      const conta = await financeiroService.obter(id);
      res.json(ok(conta));
    } catch (e) {
      res.status(404).json(fail(e.message));
    }
  },

  async criar(req, res) {
    try {
      const conta = await financeiroService.criar(req.body);
      await auditService.registrar({ usuario: req.user, modulo: 'financeiro', acao: 'INSERT', entidadeId: conta.id, descricao: `Conta criada`, ipAddress: req.ip });
      res.status(201).json(ok(conta.id, 'Conta criada com sucesso'));
    } catch (e) {
      res.status(400).json(fail(e.message));
    }
  },

  async atualizar(req, res) {
    try {
      const { id } = req.params;
      if (req.body.id && req.body.id !== id) {
        return res.status(400).json(fail('ID da rota difere do body'));
      }
      await financeiroService.atualizar(id, req.body);
      await auditService.registrar({ usuario: req.user, modulo: 'financeiro', acao: 'UPDATE', entidadeId: id, descricao: `Conta atualizada: ${id}`, ipAddress: req.ip });
      res.json(ok(null, 'Conta atualizada com sucesso'));
    } catch (e) {
      if (e.message.includes('não encontrada')) {
        return res.status(404).json(fail(e.message));
      }
      res.status(400).json(fail(e.message));
    }
  },

  async baixar(req, res) {
    try {
      const { id } = req.params;
      if (req.body.id && req.body.id !== id) {
        return res.status(400).json(fail('ID da rota difere do body'));
      }
      await financeiroService.baixar(id, req.body);
      await auditService.registrar({ usuario: req.user, modulo: 'financeiro', acao: 'BAIXAR', entidadeId: id, descricao: `Conta baixada (paga): ${id}`, ipAddress: req.ip });
      res.json(ok(null, 'Conta baixada com sucesso'));
    } catch (e) {
      if (e.message.includes('não encontrada')) {
        return res.status(404).json(fail(e.message));
      }
      if (e.message.includes('já está paga')) {
        return res.status(400).json(fail(e.message));
      }
      res.status(400).json(fail(e.message));
    }
  }
};

export default financeiroController;
