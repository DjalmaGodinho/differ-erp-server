import { pedidoService } from '../services/index.js';

const ok = (data, message) => ({ success: true, data, message });
const fail = (message) => ({ success: false, message });

const pedidoController = {
  async listar(req, res) {
    try {
      const { page = 1, pageSize = 20, search, tipoId, statusId, prioridadeId, clienteId } = req.query;
      const result = await pedidoService.listar({ 
        page: parseInt(page), 
        pageSize: parseInt(pageSize), 
        search, 
        tipoId: tipoId ? parseInt(tipoId) : null,
        statusId: statusId ? parseInt(statusId) : null,
        prioridadeId: prioridadeId ? parseInt(prioridadeId) : null,
        clienteId
      });
      res.json(ok(result));
    } catch (e) {
      res.status(400).json(fail(e.message));
    }
  },

  async obter(req, res) {
    try {
      const { id } = req.params;
      const pedido = await pedidoService.obter(id);
      res.json(ok(pedido));
    } catch (e) {
      res.status(404).json(fail(e.message));
    }
  },

  async criar(req, res) {
    try {
      const pedido = await pedidoService.criar(req.body);
      res.status(201).json(ok(pedido.id, 'Pedido criado com sucesso'));
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
      await pedidoService.atualizar(id, req.body);
      res.json(ok(null, 'Pedido atualizado com sucesso'));
    } catch (e) {
      if (e.message.includes('não encontrado')) {
        return res.status(404).json(fail(e.message));
      }
      res.status(400).json(fail(e.message));
    }
  },

  async atualizarStatus(req, res) {
    try {
      const { id } = req.params;
      const { statusId } = req.body;
      await pedidoService.atualizarStatus(id, statusId);
      res.json(ok(null, 'Status do pedido atualizado com sucesso'));
    } catch (e) {
      if (e.message.includes('não encontrado')) {
        return res.status(404).json(fail(e.message));
      }
      res.status(400).json(fail(e.message));
    }
  },

  async cancelar(req, res) {
    try {
      const { id } = req.params;
      await pedidoService.cancelar(id);
      res.json(ok(null, 'Pedido cancelado com sucesso'));
    } catch (e) {
      if (e.message.includes('não encontrado')) {
        return res.status(404).json(fail(e.message));
      }
      if (e.message.includes('já está cancelado')) {
        return res.status(400).json(fail(e.message));
      }
      res.status(400).json(fail(e.message));
    }
  },

  async efetivar(req, res) {
    try {
      const { id } = req.params;
      const { irParaConcluido, condicaoPagamentoId, formaPagamentoId } = req.body;
      
      const pedido = await pedidoService.efetivar(id, { irParaConcluido, condicaoPagamentoId, formaPagamentoId });
      
      res.json(ok(pedido, 'Pedido efetivado com sucesso'));
    } catch (e) {
      if (e.message.includes('não encontrado')) {
        return res.status(404).json(fail(e.message));
      }
      if (e.message.includes('já está efetivado')) {
        return res.status(400).json(fail(e.message));
      }
      res.status(400).json(fail(e.message));
    }
  }
};

export default pedidoController;
