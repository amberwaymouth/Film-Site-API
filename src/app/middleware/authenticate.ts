import {Request, Response} from "express";
import {findUserIdByToken} from "../models/user.server.model";
import Logger from "../../config/logger";


exports.isAuthenticated = async (req: Request, res: Response, next: any): Promise<void> => {
    const User = require('../app/models/user.server.controller');
    const token = req.header("X-Authorization");

    try {
        const result = await findUserIdByToken (token);
        if (result === null) {
            res.statusMessage = 'Unauthorised';
            res.status(401).send();
        } else {
            next();
        }
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
        return;
    }
}