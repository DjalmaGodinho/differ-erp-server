import { clienteRepository } from '../repositories/index.js';

const clienteService = {
  async listar({ page, pageSize, search, statusId }) {
    return await clienteRepository.findAll({ page, pageSize, search, statusId });
  },

  async obter(id) {
    const cliente = await clienteRepository.findById(id);
    if (!cliente) throw new Error('Cliente não encontrado');
    return cliente;
  },

  async criar(data) {
    if (!data.nome || !data.documento) {
      throw new Error('Nome e documento são obrigatórios');
    }

    const tipoPessoa = data.tipo_pessoa_id || 'J';
    if (!['F', 'J'].includes(tipoPessoa)) {
      throw new Error('Tipo pessoa deve ser F (Física) ou J (Jurídica)');
    }

    const existe = await clienteRepository.findByDocumento(data.documento);
    if (existe) {
      throw new Error(`Já existe um cliente com o documento '${data.documento}'`);
    }

    data.codigo = await clienteRepository.generateCodigo();
    data.tipo_pessoa_id = tipoPessoa;
    data.status_id = data.status_id || 1;

    return await clienteRepository.create(data);
  },

  async atualizar(id, data) {
    const cliente = await clienteRepository.findById(id);
    if (!cliente) throw new Error('Cliente não encontrado');

    if (data.documento && data.documento !== cliente.documento) {
      const existe = await clienteRepository.findByDocumento(data.documento, id);
      if (existe) {
        throw new Error(`Já existe um cliente com o documento '${data.documento}'`);
      }
    }

    return await clienteRepository.update(id, data);
  },

  async excluir(id) {
    const cliente = await clienteRepository.findById(id);
    if (!cliente) throw new Error('Cliente não encontrado');
    await clienteRepository.delete(id);
    return true;
  }
};

export default clienteService;
