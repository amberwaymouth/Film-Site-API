import {Request, Response} from "express";
import * as users from '../models/user.server.model';
import Logger from "../../config/logger";
import Ajv from 'ajv';
const ajv = new Ajv({removeAdditional: 'all', strict: false});
import * as schemas from '../resources/schemas.json';
import {getPool} from "../../config/db";
import test from "node:test";
import {findUserIdByToken, getUserById} from "../models/user.server.model";
import {validate} from "../validator/validator";


const register = async (req: Request, res: Response): Promise<void> => {
    const validation = await validate(
        schemas.user_register,
        req.body);
    if (validation !== true) {
        res.statusMessage = `Bad Request: ${validation.toString()}`;
        res.status(400).send();
        return;
    }
    Logger.http(`POST create a user with the name ${req.body.firstName} ${req.body.lastName}`)
    const password = req.body.password;
    const firstName = req.body.firstName;
    const lastName = req.body.lastName;
    const email = req.body.email;

    try{
        const check = await users.getOne(email);
        if (check.length !== 0) {
            res.status(403).send("Forbidden. Email already in use");
            return;
        }
        if (password.length < 6) {
            res.statusMessage = "Bad Request. Invalid information";
            res.status(400).send();
            return;
        }
        if ((email == null) || (firstName == null) || (lastName == null) || (password == null)) {
            res.statusMessage = "Bad Request. Invalid information";
            res.status(400).send();
            return;
        }
        if (email  === "" ) {
            res.status(400).send("Please enter an email");
            return;
        }
        if (lastName.length > 64) {
            res.status(400).send("Last name is too long and/or contains invalid characters");
            return;
        }

        const result = await users.register(email, firstName, lastName, password);
        res.status(201).json({"userId": result.insertId });
    } catch (err) {
        res.status( 500 ).send( `ERROR registering user ${firstName} ${lastName}: ${ err }` );
    }
}


const login = async (req: Request, res: Response): Promise<void> => {
    Logger.http('Logging in ...');
    const email = req.body.email;
    const password = req.body.password;
    const validation = await validate (schemas.user_login, req.body);
    if (validation !== true) {
        res.statusMessage = "Bad request. Invalid information";
        res.status(400).send();
        return;
    }

    try{
        const check = await users.getOne(email);
        const bcrypt = require("bcrypt");
        if (email == null || email === "") {
            res.statusMessage = "Bad Request. Invalid information";
            res.status(400).send();
            return;
        }
        if (check.length === 0) {
            res.statusMessage = "Bad Request. Invalid information";
            res.status(400).send("User not found. Please register as a new user");
            return;
        }
        const userPassword = (await users.getOne(email))[0].password;
        const userEmail = (await users.getOne(email))[0].id;
        if ( await bcrypt.compare(password, userPassword)) {
            const result = await users.login(email, password);
            const token = (await users.getOne(email))[0].auth_token;
            res.statusMessage= 'OK';
            res.status(200).send({'userId': userEmail, 'token': token});
            return;
        } else {
            res.statusMessage = 'Not Authorised. Incorrect email/password';
            res.status(401).send();
            return;
        }

    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
        return;
    }
}

const logout = async (req: Request, res: Response): Promise<void> => {
        const token = req.header("X-Authorization");
        try {
            const result = await findUserIdByToken(token);
            if (result.length === 0) {
                res.statusMessage = 'Unauthorised. Cannot log out if you are not authenticated';
                res.status(401).send();
                return;
            } else {
                const out = await users.logout(token);
                res.statusMessage = 'OK';
                res.status(200).send();
            }
        } catch (err) {
            Logger.error(err);
            res.statusMessage = "Internal Server Error";
            res.status(500).send();
            return;
        }
    }

const view = async (req: Request, res: Response): Promise<void> => {
    const token = req.header("X-Authorization");
    const id = +req.params.id;
    if (isNaN(id)) {
        res.statusMessage = "Invalid ID";
        res.status(400).send();
        return;
    }
    try {
        const get = await users.getUserById(id);
        if (get.length === 0) {
            res.statusMessage = "Not Found. No user with specified ID";
            res.status(404).send();
            return;
        }
        const result = await findUserIdByToken(token);
        const firstName = get[0].first_name;
        const lastName = get[0].last_name;
        const userEmail = get[0].email;
        if (result.length === 0) {
            res.statusMessage = 'OK';
            res.status(200).send({'firstName': firstName, 'lastName': lastName});
            return;
        } else  {

            if (result[0].id === id) {
                res.statusMessage = 'OK';
                res.status(200).send({'email': userEmail, 'firstName': firstName, 'lastName': lastName});
            } else {
                res.statusMessage = 'OK';
                res.status(200).send({'firstName': firstName, 'lastName': lastName});
            }

        }
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
        return;
    }
}


const update = async (req: Request, res: Response): Promise<void> => {
    const email = req.body.email;
    const firstName = req.body.firstName;
    const lastName = req.body.lastName;
    const password = req.body.password;
    const currentPassword = req.body.currentPassword;
    const token = req.header("X-Authorization");
    const id = +req.params.id;
    if (isNaN(id)) {
        res.statusMessage = "Invalid ID";
        res.status(400).send();
        return;
    }
    const user = await getUserById(id);

    const validation = await validate (schemas.user_edit, req.body);
    if (validation !== true) {
        res.statusMessage = "Bad request. Invalid information";
        res.status(400).send();
        return;
    }

    if (user.length === 0) {
        res.statusMessage = "Not found";
        res.status(404).send();
        return;
    }
    try {
        const result = await findUserIdByToken(token);
        const userPassword = (await users.getUserById(id))[0].password;
        const bcrypt = require("bcrypt");
        const userId = result[0].id;
        // const compare = await bcrypt.compare(password, userPassword);
        // const get = await users.getOne(email);
        if (result.length === 0 || userId !== id) {
            res.statusMessage = 'Forbidden. This is not your account, or the email is already in use, or identical current and new passwords';
            res.status(403).send();
            return;
        }
         if (email !== null && email !== "" && email !== undefined) {
            const check = await users.getOne(email);
            if (check.length !== 0) {
                res.status(403).send("Forbidden. Email already in use");
                return;
                }
                const updateEmail = await users.updateEmail(email, id);
             }
            if (firstName !== null && firstName !== "" && firstName !== undefined) {
                const updateFirstName = await users.updateFirstName(firstName, id);
            }
            if (lastName !== null && lastName !== "" && lastName !== undefined) {
                if (lastName.length > 64) {
                    res.status(400).send("Last name is too long and/or contains invalid characters");
                    return;
                }
                const updateLastName = await users.updateLastName(lastName, id);
            }
            if (password !== null && password !== "" && password !== undefined) {
                if (currentPassword === password) {
                    res.statusMessage = 'Forbidden. This is not your account, or the email is already in use, or identical current and new passwords';
                    res.status(403).send();
                    return;
                }
                if(!(await bcrypt.compare(currentPassword, userPassword))) {
                    res.statusMessage = "Unauthorised or invalid currentPassword";
                    res.status(401).send();
                    return;
                }
                if (password.length < 6) {
                    res.statusMessage = "Bad request. Invalid information";
                    res.status(400).send();
                }
                const hashedPassword = await bcrypt.hash(password, 10);
                const updatePassword = await users.updatePassword(hashedPassword, id);
            }
            res.statusMessage = 'OK';
            res.status(200).send();



    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
        return;
    }
}

export {register, login, logout, view, update}