import {Request, Response} from "express";
import Logger from "../../config/logger";
import * as users from '../models/user.image.server.model';
import {validate} from "../validator/validator";
import * as schemas from "../resources/schemas.json";
import {findUserIdByToken, getUserById} from "../models/user.server.model";
import path from "path";
import sharp from "sharp";
import fs from "fs";
import {getExtensionFromContentType} from "../models/user.image.server.model";

const getImage = async (req: Request, res: Response): Promise<void> => {
    const id = +req.params.id;
    try{
        if (isNaN(+id)) {
            res.statusMessage = "Bad request. Invalid information";
            res.status(400).send();
            return;
        }
        const user = await getUserById(id);
        if (user.length === 0 || user[0].image_filename == null) {
            res.statusMessage = "Not Found. No user with specified ID, or user has no image";
            res.status(404).send();
            return;
        }
        const storagePath = path.join(__dirname, '../../../storage/images');
        const imagePath = path.join(storagePath, user[0].image_filename);
        res.statusMessage = 'OK';
        res.status(200).sendFile(imagePath);
        return;
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
        return;
    }
}


const setImage = async (req: Request, res: Response): Promise<void> => {
    const token = req.header("X-Authorization");
    const imageData = req.body;
    const id = +req.params.id;
    try {
        if (isNaN(id)) {
            res.statusMessage = "Bad request. Invalid information";
            res.status(400).send();
            return;
        }
        const user = await getUserById(id);
        const result = await findUserIdByToken(token);
        if (user.length === 0) {
            res.statusMessage = "Not found. No such user with ID given";
            res.status(404).send();
            return;
        }
        if (result.length === 0) {
            res.statusMessage = 'Unauthorised';
            res.status(401).send();
            return;
        } else {
            if (id !== result[0].id) {
                res.statusMessage = "Forbidden. Can not change another user's profile photo";
                res.status(403).send();
                return;
            }
            const fileType = req.headers[`content-type`] as string;
            const validImageTypes = [`image/gif`, `image/jpeg`, `image/png`];
            if (! validImageTypes.includes(fileType)) {
                res.statusMessage = "Bad request. Invalid image supplied (possibly incorrect file type";
                res.status(400).send();
                return;
            }
            const extension = getExtensionFromContentType(fileType);
            const filename = `user_${id}.${extension}`;
            await users.setImage(id, filename);
            if (user[0].image_filename == null) {
                const storagePath = path.join(__dirname, '../../../storage/images');
                const imagePath = path.join(storagePath, filename);
                fs.writeFile(imagePath, imageData, (err: any) => {
                    if (err) {
                        res.statusMessage = "Internal server error";
                        res.status(500).send();
                    }
                });
                res.statusMessage = "Created. New image created";
                res.status(201).send();
                return;
            }
            if (user[0].image_filename !== null) {
                const storagePath = path.join(__dirname, '../../../storage/images');
                const imagePath = path.join(storagePath, filename);
                const oldImage = path.join(storagePath, user[0].image_filename);
                fs.unlink(oldImage, (err: any) => {
                    if (err) {
                        res.statusMessage = "Internal server error";
                        res.status(500).send();
                    }
                });
                fs.writeFile(imagePath, imageData, (err: any) => {
                    if (err) {
                        res.statusMessage = "Internal server error";
                        res.status(500).send();
                    }
                });
                res.statusMessage = "OK. Image updated";
                res.status(200).send();
                return;
            }

        }
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
        return;
    }
}


const deleteImage = async (req: Request, res: Response): Promise<void> => {
    const token = req.header("X-Authorization");
    const id = +req.params.id;
    if (isNaN(+id)) {
        res.statusMessage = "Bad request. Invalid information";
        res.status(400).send();
        return;
    }
    try {
        const user = await getUserById(id);
        const result = await findUserIdByToken(token);
        if (user.length === 0) {
            res.statusMessage = "Not found. No such user with ID given";
            res.status(404).send();
            return;
        }
        if (result.length === 0) {
            res.statusMessage = 'Unauthorised';
            res.status(401).send();
            return;
        } else {
            if (id !== result[0].id) {
                res.statusMessage = "Forbidden. Can not delete another user's profile photo";
                res.status(403).send();
                return;
            }
            if (user[0].image_filename !== null) {
                await users.deleteImage(id);
                const storagePath = path.join(__dirname, '../../../storage/images');
                const imagePath = path.join(storagePath, user[0].image_filename);
                fs.unlink(imagePath, (err: any) => {
                    if (err) {
                        res.statusMessage = "Internal server error";
                        res.status(500).send();
                    }
                });
                res.statusMessage = "OK";
                res.status(200).send();
                return;
            } else {
                res.statusMessage = "OK";
                res.status(200).send("No profile image to delete");
            }
        }
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
        return;
    }
}

export {getImage, setImage, deleteImage}