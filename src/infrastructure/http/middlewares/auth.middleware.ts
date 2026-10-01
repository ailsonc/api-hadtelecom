import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthenticatedRequest extends Request {
    user?: any;
}

export const authenticateToken = (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): void => {
    const authHeader = req.headers['authorization'];
    // Formato esperado: "Bearer <token>"
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        res.status(401).json({ error: 'Acesso negado. Token não fornecido.' });
        return;
    }

    const secret = process.env.JWT_SECRET || 'fallback_secret';

    jwt.verify(token, secret, (err, decoded) => {
        if (err) {
            res.status(403).json({ error: 'Token inválido ou expirado.' });
            return;
        }

        req.user = decoded;
        next();
    });
};