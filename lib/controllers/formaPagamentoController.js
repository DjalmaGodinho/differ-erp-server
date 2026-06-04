import { formaPagamentoService } from '../services/index.js';

const ok = (data, message) => ({ success: true, data, message });
const fail = (message) => ({ success: false, message });

const formaPagamentoController = {
  async listar(req, res) {
    try {
      const formas = await formaPagamentoService.listar();
      res.json(ok(formas));
    } catch (e) {
      res.status(400).json(fail(e.message));
    }
  },

  async obter(req, res) {
    try {
      const { id } = req.params;
      const forma = await formaPagamentoService.obter(id);
      res.json(ok(forma));
    } catch (e) {
      res.status(404).json(fail(e.message));
    }
  },

  async criar(req, res) {
    try {
      const forma = await formaPagamentoService.criar(req.body);
      res.status(201).json(ok(forma, 'Forma de pagamento criada com sucesso'));
    } catch (e) {
      res.status(400).json(fail(e.message));
    }
  },

  async atualizar(req, res) {
    try {
      const { id } = req.params;
      const forma = await formaPagamentoService.atualizar(id, req.body);
      res.json(ok(forma, 'Forma de pagamento atualizada com sucesso'));
    } catch (e) {
      res.status(400).json(fail(e.message));
    }
  },

  async excluir(req, res) {
    try {
      const { id } = req.params;
      await formaPagamentoService.excluir(id);
      res.json(ok(null, 'Forma de pagamento excluída com sucesso'));
    } catch (e) {
      res.status(400).json(fail(e.message));
    }
  }
};

export default formaPagamentoController;
