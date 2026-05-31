import { query } from '../config/database.js';

const TABLE = 'user_profiles';

const usuarioRepository = {
  async findAll() {
    const result = await query(`
      SELECT id, email, nome, role, ativo, created_at, updated_at
      FROM ${TABLE}
      WHERE ativo = true
      ORDER BY nome
    `);
    return result.rows;
  },

  async findById(id) {
    const result = await query(`
      SELECT id, email, nome, role, ativo, created_at, updated_at
      FROM ${TABLE}
      WHERE id = $1
    `, [id]);
    return result.rows[0] || null;
  },

  async findByEmail(email) {
    const result = await query(`
      SELECT id, email, nome, role, ativo, created_at, updated_at
      FROM ${TABLE}
      WHERE email = $1
    `, [email]);
    return result.rows[0] || null;
  },

  async create({ id, email, nome, role = 'USUARIO' }) {
    const normalizedRole = (role || 'USUARIO').toUpperCase();
    const result = await query(`
      INSERT INTO ${TABLE} (id, email, nome, role, ativo, created_at, updated_at)
      VALUES ($1, $2, $3, $4, true, NOW(), NOW())
      RETURNING *
    `, [id, email, nome, normalizedRole]);
    return result.rows[0];
  },

  async updateRole(id, role) {
    const normalizedRole = (role || 'USUARIO').toUpperCase();
    const result = await query(`
      UPDATE ${TABLE} SET role = $1, updated_at = NOW() WHERE id = $2 RETURNING *
    `, [normalizedRole, id]);
    return result.rows[0];
  },

  async delete(id) {
    await query(`UPDATE ${TABLE} SET ativo = false, updated_at = NOW() WHERE id = $1`, [id]);
    return true;
  },

  async existsAdmin() {
    const result = await query(`SELECT 1 FROM ${TABLE} WHERE role = 'ADMIN' AND ativo = true LIMIT 1`);
    return result.rows.length > 0;
  }
};

export default usuarioRepository;
