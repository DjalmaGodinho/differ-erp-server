import { clienteService } from '../services/index.js';

const ok = (data, message) => ({ success: true, data, message });
const fail = (message) => ({ success: false, message });

const clienteController = {
  async listar(req, res) {
    try {
      const { page = 1, pageSize = 20, search, statusId } = req.query;
      const result = await clienteService.listar({ 
        page: parseInt(page), 
        pageSize: parseInt(pageSize), 
        search, 
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
      const cliente = await clienteService.obter(id);
      res.json(ok(cliente));
    } catch (e) {
      res.status(404).json(fail(e.message));
    }
  },

  async criar(req, res) {
    try {
      const cliente = await clienteService.criar(req.body);
      res.status(201).json(ok(cliente.id, 'Cliente criado com sucesso'));
    } catch (e) {
      if (e.message.includes('Já existe')) {
        return res.status(409).json(fail(e.message));
      }
      res.status(400).json(fail(e.message));
    }
  },

  async atualizar(req, res) {
    try {
      const { id } = req.params;
      if (req.body.id && req.body.id !== id) {
        return res.status(400).json(fail('ID da rota difere do body'));
      }
      await clienteService.atualizar(id, req.body);
      res.json(ok(null, 'Cliente atualizado com sucesso'));
    } catch (e) {
      if (e.message.includes('não encontrado')) {
        return res.status(404).json(fail(e.message));
      }
      if (e.message.includes('Já existe')) {
        return res.status(409).json(fail(e.message));
      }
      res.status(400).json(fail(e.message));
    }
  },

  async excluir(req, res) {
    try {
      const { id } = req.params;
      await clienteService.excluir(id);
      res.json(ok(null, 'Cliente inativado com sucesso'));
    } catch (e) {
      if (e.message.includes('não encontrado')) {
        return res.status(404).json(fail(e.message));
      }
      res.status(400).json(fail(e.message));
    }
  }
};

export default clienteController;
