import { producaoService } from '../services/index.js';

const ok = (data, message) => ({ success: true, data, message });
const fail = (message) => ({ success: false, message });

const producaoController = {
  async listar(req, res) {
    try {
      const { page = 1, pageSize = 20, search, statusId, clienteId, maquinaId } = req.query;
      const result = await producaoService.listar({ 
        page: parseInt(page), 
        pageSize: parseInt(pageSize), 
        search, 
        statusId: statusId ? parseInt(statusId) : null,
        clienteId,
        maquinaId
      });
      res.json(ok(result));
    } catch (e) {
      res.status(400).json(fail(e.message));
    }
  },

  async obter(req, res) {
    try {
      const { id } = req.params;
      const op = await producaoService.obter(id);
      res.json(ok(op));
    } catch (e) {
      res.status(404).json(fail(e.message));
    }
  },

  async criar(req, res) {
    try {
      const op = await producaoService.criar(req.body);
      res.status(201).json(ok(op.id, 'Ordem de Produção criada com sucesso'));
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
      await producaoService.atualizar(id, req.body);
      res.json(ok(null, 'OP atualizada com sucesso'));
    } catch (e) {
      if (e.message.includes('não encontrada')) {
        return res.status(404).json(fail(e.message));
      }
      res.status(400).json(fail(e.message));
    }
  },

  async atualizarStatus(req, res) {
    try {
      const { id } = req.params;
      const { statusId } = req.body;
      await producaoService.atualizarStatus(id, statusId);
      res.json(ok(null, 'Status da OP atualizado com sucesso'));
    } catch (e) {
      if (e.message.includes('não encontrada')) {
        return res.status(404).json(fail(e.message));
      }
      res.status(400).json(fail(e.message));
    }
  },

  async cancelar(req, res) {
    try {
      const { id } = req.params;
      await producaoService.cancelar(id);
      res.json(ok(null, 'Ordem de produção cancelada com sucesso'));
    } catch (e) {
      if (e.message.includes('não encontrada')) {
        return res.status(404).json(fail(e.message));
      }
      res.status(400).json(fail(e.message));
    }
  }
};

export default producaoController;
