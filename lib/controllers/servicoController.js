import { servicoService } from '../services/index.js';

const ok = (data, message) => ({ success: true, data, message });
const fail = (message) => ({ success: false, message });

const servicoController = {
  async listar(req, res) {
    try {
      const { page = 1, pageSize = 20, search, categoriaId, ativo } = req.query;
      const result = await servicoService.listar({ 
        page: parseInt(page), 
        pageSize: parseInt(pageSize), 
        search, 
        categoriaId: categoriaId ? parseInt(categoriaId) : null,
        ativo: ativo !== undefined ? ativo === 'true' : true
      });
      res.json(ok(result));
    } catch (e) {
      res.status(400).json(fail(e.message));
    }
  },

  async obter(req, res) {
    try {
      const { id } = req.params;
      const servico = await servicoService.obter(id);
      res.json(ok(servico));
    } catch (e) {
      res.status(404).json(fail(e.message));
    }
  },

  async criar(req, res) {
    try {
      const servico = await servicoService.criar(req.body);
      res.status(201).json(ok(servico.id, 'Serviço criado com sucesso'));
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
      await servicoService.atualizar(id, req.body);
      res.json(ok(null, 'Serviço atualizado com sucesso'));
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
      await servicoService.excluir(id);
      res.json(ok(null, 'Serviço inativado com sucesso'));
    } catch (e) {
      if (e.message.includes('não encontrado')) {
        return res.status(404).json(fail(e.message));
      }
      res.status(400).json(fail(e.message));
    }
  }
};

export default servicoController;
