import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';

export class AuthController {
    login(req: Request, res: Response): void {
        const { username, password } = req.body;

        const expectedUser = process.env.ADMIN_USER;
        const expectedPass = process.env.ADMIN_PASS;
        const secret = process.env.JWT_SECRET || 'fallback_secret';

        if (!username || !password) {
            res.status(400).json({ error: 'Usuário e senha são obrigatórios.' });
            return;
        }

        if (username !== expectedUser || password !== expectedPass) {
            res.status(401).json({ error: 'Credenciais inválidas.' });
            return;
        }

        // Gera o token com validade de 8 horas
        const token = jwt.sign(
            { username, role: 'admin' },
            secret,
            { expiresIn: '8h' }
        );

        res.status(200).json({
            message: 'Login realizado com sucesso.',
            token,
            expiresIn: '8h'
        });
    }
}