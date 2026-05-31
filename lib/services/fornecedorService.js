import { fornecedorRepository } from '../repositories/index.js';

const fornecedorService = {
  async listar({ page, pageSize, search, statusId, categoriaId }) {
    return await fornecedorRepository.findAll({ page, pageSize, search, statusId, categoriaId });
  },

  async obter(id) {
    const fornecedor = await fornecedorRepository.findById(id);
    if (!fornecedor) throw new Error('Fornecedor não encontrado');
    return fornecedor;
  },

  async criar(data) {
    if (!data.nome || !data.documento) {
      throw new Error('Nome e documento são obrigatórios');
    }

    const tipoPessoa = data.tipo_pessoa_id || 'J';
    if (!['F', 'J'].includes(tipoPessoa)) {
      throw new Error('Tipo pessoa deve ser F (Física) ou J (Jurídica)');
    }

    const existe = await fornecedorRepository.findByDocumento(data.documento);
    if (existe) {
      throw new Error(`Já existe um fornecedor com o documento '${data.documento}'`);
    }

    data.codigo = await fornecedorRepository.generateCodigo();
    data.tipo_pessoa_id = tipoPessoa;
    data.status_id = data.status_id || 1;

    return await fornecedorRepository.create(data);
  },

  async atualizar(id, data) {
    const fornecedor = await fornecedorRepository.findById(id);
    if (!fornecedor) throw new Error('Fornecedor não encontrado');

    if (data.documento && data.documento !== fornecedor.documento) {
      const existe = await fornecedorRepository.findByDocumento(data.documento, id);
      if (existe) {
        throw new Error(`Já existe um fornecedor com o documento '${data.documento}'`);
      }
    }

    return await fornecedorRepository.update(id, data);
  },

  async excluir(id) {
    const fornecedor = await fornecedorRepository.findById(id);
    if (!fornecedor) throw new Error('Fornecedor não encontrado');
    await fornecedorRepository.delete(id);
    return true;
  }
};

export default fornecedorService;
