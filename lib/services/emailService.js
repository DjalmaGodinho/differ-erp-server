import nodemailer from 'nodemailer';

/**
 * Email Service - Secure SMTP Configuration
 * 
 * SECURITY NOTE: SMTP credentials are loaded from environment variables
 * (process.env) instead of JSON files to prevent credential exposure.
 * 
 * Required environment variables:
 * - SMTP_HOST: SMTP server hostname
 * - SMTP_PORT: SMTP server port (usually 587 for TLS)
 * - SMTP_SECURE: Use TLS (true/false)
 * - SMTP_USER: Authentication username
 * - SMTP_PASS: Authentication password (use App Password for Gmail)
 * - SMTP_FROM_NAME: Display name for sender
 * - SMTP_FROM_EMAIL: Sender email address
 */

let transporter = null;

function loadConfig() {
  const cfg = {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
    from: {
      name: process.env.SMTP_FROM_NAME || 'DG-MECH Usinagem',
      email: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER
    }
  };
  
  return cfg;
}

function createTransporter() {
  const cfg = loadConfig();
  if (!cfg.host || !cfg.auth.user || !cfg.auth.pass) {
    console.error('[SMTP] Configuration missing. Check environment variables.');
    return null;
  }

  // Port 465 uses implicit TLS (secure=true); port 587/25 use STARTTLS (secure=false)
  const isImplicitTLS = cfg.port === 465 || cfg.secure === true;

  return nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: isImplicitTLS,
    requireTLS: !isImplicitTLS,
    auth: cfg.auth,
    tls: {
      rejectUnauthorized: false,
      minVersion: 'TLSv1.2'
    }
  });
}

export const emailService = {
  /**
   * Verify SMTP configuration is complete and working
   */
  async verificarConfiguracao() {
    const cfg = loadConfig();
    
    if (!cfg.host || !cfg.auth.user || !cfg.auth.pass) {
      return { 
        configurado: false, 
        erro: 'Configuração SMTP incompleta. Verifique as variáveis de ambiente SMTP_*' 
      };
    }

    if (cfg.auth.user.includes('your-email') || cfg.auth.user.includes('seu-email')) {
      return { 
        configurado: false, 
        erro: 'SMTP_USER cont valor padrão/não configurado' 
      };
    }

    try {
      const t = createTransporter();
      if (!t) return { configurado: false, erro: 'Erro ao criar transporter' };
      
      await t.verify();
      return { configurado: true };
    } catch (error) {
      return { configurado: false, erro: error.message };
    }
  },

  /**
   * Send email with optional attachments
   */
  async enviarEmail({ para, assunto, corpo, anexos = [] }) {
    const cfg = loadConfig();
    if (!cfg.host || !cfg.auth.user) {
      throw new Error('Configuração SMTP não encontrada. Configure as variáveis de ambiente SMTP_*');
    }

    const t = createTransporter();
    if (!t) {
      throw new Error('Erro ao criar transporter de e-mail');
    }

    const mailOptions = {
      from: `"${cfg.from.name}" <${cfg.from.email}>`,
      to: para,
      subject: assunto,
      html: corpo,
      attachments: anexos.map(a => ({
        filename: a.filename,
        content: a.content,
        encoding: 'base64'
      }))
    };

    const result = await t.sendMail(mailOptions);
    return { success: true, messageId: result.messageId };
  },

  /**
   * Get current configuration (without sensitive data)
   */
  getConfig() {
    const cfg = loadConfig();
    return {
      host: cfg.host,
      port: cfg.port,
      secure: cfg.secure,
      from: cfg.from,
      // Never return auth credentials
      auth: cfg.auth.user ? { user: cfg.auth.user.replace(/@.+/, '@***') } : null
    };
  },

  /**
   * For security, config updates are disabled.
   * All changes must go through environment variables.
   */
  async atualizarConfig() {
    throw new Error('Configuração via API desabilitada por segurança. Use variáveis de ambiente.');
  }
};

export default emailService;
