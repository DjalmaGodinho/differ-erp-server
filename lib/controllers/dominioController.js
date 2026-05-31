import { dominioService } from '../services/index.js';

const ok = (data, message) => ({ success: true, data, message });
const fail = (message) => ({ success: false, message });

const dominioController = {
  async listar(req, res) {
    try {
      const { tabela } = req.params;
      const result = await dominioService.listar(tabela);
      res.json(ok(result));
    } catch (e) {
      if (e.message.includes('não encontrada')) {
        return res.status(404).json(fail(e.message));
      }
      res.status(400).json(fail(e.message));
    }
  }
};

export default dominioController;
