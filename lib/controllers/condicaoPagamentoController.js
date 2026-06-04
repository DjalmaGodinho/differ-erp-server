import { condicaoPagamentoService } from '../services/index.js';

const ok = (data, message) => ({ success: true, data, message });
const fail = (message) => ({ success: false, message });

const condicaoPagamentoController = {
  async listar(req, res) {
    try {
      const condicoes = await condicaoPagamentoService.listar();
      res.json(ok(condicoes));
    } catch (e) {
      res.status(400).json(fail(e.message));
    }
  },

  async obter(req, res) {
    try {
      const { id } = req.params;
      const condicao = await condicaoPagamentoService.obter(id);
      res.json(ok(condicao));
    } catch (e) {
      res.status(404).json(fail(e.message));
    }
  },

  async criar(req, res) {
    try {
      const condicao = await condicaoPagamentoService.criar(req.body);
      res.status(201).json(ok(condicao, 'Condição de pagamento criada com sucesso'));
    } catch (e) {
      res.status(400).json(fail(e.message));
    }
  },

  async atualizar(req, res) {
    try {
      const { id } = req.params;
      const condicao = await condicaoPagamentoService.atualizar(id, req.body);
      res.json(ok(condicao, 'Condição de pagamento atualizada com sucesso'));
    } catch (e) {
      res.status(400).json(fail(e.message));
    }
  },

  async excluir(req, res) {
    try {
      const { id } = req.params;
      await condicaoPagamentoService.excluir(id);
      res.json(ok(null, 'Condição de pagamento excluída com sucesso'));
    } catch (e) {
      res.status(400).json(fail(e.message));
    }
  }
};

export default condicaoPagamentoController;
