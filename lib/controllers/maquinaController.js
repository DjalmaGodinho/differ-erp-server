import { maquinaService, auditService } from '../services/index.js';

const ok = (data, message) => ({ success: true, data, message });
const fail = (message) => ({ success: false, message });

const maquinaController = {
  async listar(req, res) {
    try {
      const { page = 1, pageSize = 20, search, tipoId, statusId } = req.query;
      const result = await maquinaService.listar({ 
        page: parseInt(page), 
        pageSize: parseInt(pageSize), 
        search, 
        tipoId: tipoId ? parseInt(tipoId) : null,
        statusId: statusId ? parseInt(statusId) : null
      });
      res.json(ok(result));
    } catch (e) {
      res.status(400).json(fail(e.message));
    }
  },

  async obter(req, res) {
    try {
      const { id } = req.params;
      const maquina = await maquinaService.obter(id);
      res.json(ok(maquina));
    } catch (e) {
      res.status(404).json(fail(e.message));
    }
  },

  async criar(req, res) {
    try {
      const maquina = await maquinaService.criar(req.body);
      await auditService.registrar({ usuario: req.user, modulo: 'maquinas', acao: 'INSERT', entidadeId: maquina.id, descricao: `Máquina criada: ${req.body.nome || ''}`, ipAddress: req.ip });
      res.status(201).json(ok(maquina.id, 'Máquina criada com sucesso'));
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
      await maquinaService.atualizar(id, req.body);
      await auditService.registrar({ usuario: req.user, modulo: 'maquinas', acao: 'UPDATE', entidadeId: id, descricao: `Máquina atualizada: ${req.body.nome || id}`, ipAddress: req.ip });
      res.json(ok(null, 'Máquina atualizada com sucesso'));
    } catch (e) {
      if (e.message.includes('não encontrado')) {
        return res.status(404).json(fail(e.message));
      }
      res.status(400).json(fail(e.message));
    }
  },

  async excluir(req, res) {
    try {
      const { id } = req.params;
      await maquinaService.excluir(id);
      await auditService.registrar({ usuario: req.user, modulo: 'maquinas', acao: 'DELETE', entidadeId: id, descricao: `Máquina inativada: ${id}`, ipAddress: req.ip });
      res.json(ok(null, 'Máquina inativada com sucesso'));
    } catch (e) {
      if (e.message.includes('não encontrado')) {
        return res.status(404).json(fail(e.message));
      }
      res.status(400).json(fail(e.message));
    }
  }
};

export default maquinaController;
