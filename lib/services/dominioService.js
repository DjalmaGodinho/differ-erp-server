import { dominioRepository } from '../repositories/index.js';

const dominioService = {
  async listar(tabela) {
    return await dominioRepository.listar(tabela);
  }
};

export default dominioService;
