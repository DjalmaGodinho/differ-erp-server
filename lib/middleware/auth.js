import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

const supabaseUrl = process.env.SUPABASE_URL;
const jwksUri = `${supabaseUrl}/auth/v1/.well-known/jwks.json`;

const client = jwksClient({
  jwksUri,
  cache: true,
  rateLimit: true,
});

const getKey = (header, callback) => {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) return callback(err);
    const signingKey = key.getPublicKey();
    callback(null, signingKey);
  });
};

export const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Token não fornecido' });
  }

  const token = authHeader.substring(7);

  jwt.verify(token, getKey, {
    algorithms: ['RS256'],
    audience: 'authenticated',
    issuer: supabaseUrl + '/auth/v1',
  }, (err, decoded) => {
    if (err) {
      return res.status(401).json({ success: false, message: 'Token inválido: ' + err.message });
    }

    req.user = {
      id: decoded.sub,
      email: decoded.email,
      role: decoded.role || 'usuario',
      name: decoded.user_metadata?.name || decoded.email,
    };
    
    next();
  });
};

export const authorize = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Não autenticado' });
    }

    const userRole = req.user.role;
    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ success: false, message: 'Acesso negado' });
    }
    
    next();
  };
};

export const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }

  const token = authHeader.substring(7);

  jwt.verify(token, getKey, {
    algorithms: ['RS256'],
    audience: 'authenticated',
    issuer: supabaseUrl + '/auth/v1',
  }, (err, decoded) => {
    if (!err) {
      req.user = {
        id: decoded.sub,
        email: decoded.email,
        role: decoded.role || 'usuario',
        name: decoded.user_metadata?.name || decoded.email,
      };
    }
    next();
  });
};

export const getSupabaseConfig = () => ({
  url: supabaseUrl,
  anonKey: process.env.SUPABASE_ANON_KEY,
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
});
